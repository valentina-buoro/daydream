import { parseCustomerRequest, customerRequestRow, RequestValidationError } from "../_shared/customer_request.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
/** Required secrets are read only in the server runtime. Missing setup fails closed. */
function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
/** Escape applicant text before embedding it in HTML email. */
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
/** Delivers an administrator notification; the review link never performs a decision on GET. */
async function notify(request: { id: string; name: string; company: string; email: string; message: string; kind: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `application-${request.id}`,
    },
    body: JSON.stringify({
      from: env("EMAIL_FROM"),
      to: [env("ADMIN_EMAIL")],
      subject: "New customer access request",
      html: `<h2>New introduction</h2><p>${escape(request.kind)}: ${escape(request.name)} — ${escape(request.company)}</p><p>${escape(request.email)}</p><p>${escape(request.message)}</p><a href="${escape(new URL("/admin", env("APP_URL")).href)}">Open portal to review</a>`,
    }),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}
/** Handles public requests and authenticated admin actions. Authorization always runs on the server. */
export async function handleRequest(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const appUrl = Deno.env.get("APP_URL");
  const allowedOrigins = new Set(
    [appUrl, ...(Deno.env.get("ALLOWED_ORIGINS") || "").split(",")]
      .filter((value): value is string => Boolean(value?.trim()))
      .map(value => new URL(value.trim()).origin),
  );
  const allowed = origin && allowedOrigins.has(origin) ? origin : undefined;
  const headers = {
    "Access-Control-Allow-Origin": allowed || "null",
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  /** Returns a JSON response with the configured CORS boundary. */
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigins.has(origin))
    return respond({ error: "Origin not permitted" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST")
    return respond({ error: "Method not allowed" }, 405);
  try {
    const db = createClient(
      env("SUPABASE_URL"),
      env("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    if (Number(req.headers.get("content-length")) > 20000) return respond({ error: "Request too large" }, 413);
    const rawBody = await req.text();
    if (rawBody.length > 20000) return respond({ error: "Request too large" }, 413);
    let payload;
    try { payload = JSON.parse(rawBody); }
    catch { return respond({ error: "Invalid JSON" }, 400); }
    if (!payload || typeof payload !== "object") return respond({ error: "Invalid request" }, 400);
    const { action } = payload;
    if (action === "request") {
      const values = customerRequestRow(parseCustomerRequest(payload));
      // Unique email prevents duplicate requests and duplicate notification spam. Do not reveal existing records.
      const { data, error } = await db
        .from("customer_requests")
        .insert(values)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") return respond({ ok: true });
        throw error;
      }
      try {
        await notify(data);
        await db
          .from("customer_requests")
          .update({ notification_sent: true })
          .eq("id", data.id);
      } catch {
        console.error("Application saved; notification needs retry", data.id);
      }
      return respond({ ok: true });
    }
    const token = (req.headers.get("Authorization") || "").replace(
      /^Bearer /,
      "",
    );
    if (!token) return respond({ error: "Sign in required" }, 401);
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(token);
    if (authError || !user) return respond({ error: "Sign in required" }, 401);
    const { data: admin } = await db
      .from("portal_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!admin) return respond({ error: "Administrator access required" }, 403);
    if (action === "list") {
      const { data, error } = await db
        .from("customer_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return respond({ requests: data });
    }
    if (action === "retry-notification") {
      const { data, error } = await db
        .from("customer_requests")
        .select("*")
        .eq("id", payload.id)
        .single();
      if (error) throw error;
      await notify(data);
      await db
        .from("customer_requests")
        .update({ notification_sent: true })
        .eq("id", data.id);
      return respond({ ok: true });
    }
    if (action !== "decide" || !["approved", "denied"].includes(payload.status))
      return respond({ error: "Unknown action" }, 400);
    const { data: r, error } = await db
      .from("customer_requests")
      .select("*")
      .eq("id", payload.id)
      .single();
    if (error) throw error;
    if (r.status !== "pending") return respond({ ok: true, status: r.status });
    if (payload.status === "denied") {
      const { error } = await db
        .from("customer_requests")
        .update({
          status: "denied",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", r.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error) throw error;
      // The conditional update prevents a stale denial from changing an approval.
      return respond({ ok: true });
    }
    // generateLink creates the Auth identity without sending email or confirming ownership.
    // Retrying with an existing unconfirmed identity remains safe; access is finalized separately below.
    const { data: link, error: linkError } = await db.auth.admin.generateLink({
      type: "magiclink",
      email: r.email,
      options: { redirectTo: new URL("/account", env("APP_URL")).href },
    });
    if (linkError) throw linkError;
    const { error: finalizeError } = await db.rpc(
      "finalize_customer_approval",
      { request_id: r.id, user_id: link.user.id, reviewer_id: user.id },
    );
    if (finalizeError) throw finalizeError;
    // Approval is durable before Auth sends a passwordless link. Failed delivery may be retried via the login page.
    const authClient = createClient(
      env("SUPABASE_URL"),
      env("SUPABASE_ANON_KEY"),
      { auth: { persistSession: false } },
    );
    const { error: mailError } = await authClient.auth.signInWithOtp({
      email: r.email,
      options: { shouldCreateUser: false, emailRedirectTo: new URL("/account", env("APP_URL")).href },
    });
    return respond({ ok: true, email_sent: !mailError });
  } catch (error) {
    if (error instanceof RequestValidationError) return respond({ error: error.message }, 400);
    console.error("Portal operation failed", error);
    return respond(
      {
        error:
          "Could not complete this operation. Please try again or contact support.",
      },
      500,
    );
  }
}
