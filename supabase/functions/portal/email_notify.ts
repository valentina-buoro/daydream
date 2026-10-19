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
async function notify(request: any) {
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
      html: `<h2>New introduction</h2><p>${escape(request.name)} — ${escape(request.company)}</p><p>${escape(request.email)}</p><p>${escape(request.message)}</p><a href="${escape(env("APP_URL"))}">Open portal to review</a>`,
    }),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}
/** Validates field types and limits before any database or email operation. */
function textField(value: unknown, max: number, required = true) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error("Please complete all required fields");
  return value.trim();
}
/** Handles public requests and authenticated admin actions. Authorization always runs on the server. */
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const allowed = Deno.env.get("APP_URL");
  const headers = {
    "Access-Control-Allow-Origin": allowed || "null",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
  /** Returns a JSON response with the configured CORS boundary. */
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (origin && origin !== allowed)
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
    const payload = await req.json();
    const { action } = payload;
    if (action === "request") {
      const email = textField(payload.email, 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return respond({ error: "Enter a valid email" }, 400);
      const values = {
        email,
        name: textField(payload.name, 120),
        company: textField(payload.company, 160),
        message: textField(payload.message ?? "", 2000, false),
      };
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
        .eq("status", "pending");
      if (error) throw error;
      return respond({ ok: true });
    }
    // generateLink creates the Auth identity without sending email or confirming ownership.
    // Retrying with an existing unconfirmed identity remains safe; access is finalized separately below.
    const { data: link, error: linkError } = await db.auth.admin.generateLink({
      type: "magiclink",
      email: r.email,
      options: { redirectTo: env("APP_URL") },
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
      options: { shouldCreateUser: false, emailRedirectTo: env("APP_URL") },
    });
    return respond({ ok: true, email_sent: !mailError });
  } catch (error) {
    console.error("Portal operation failed", error);
    return respond(
      {
        error:
          "Could not complete this operation. Please try again or contact support.",
      },
      500,
    );
  }
});
