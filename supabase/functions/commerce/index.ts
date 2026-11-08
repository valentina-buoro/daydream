import { createClient } from "npm:@supabase/supabase-js@2";
import { cors, requiredEnv, stripeRequest } from "../_shared/commerce.ts";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function text(value: unknown, max: number) {
  if (typeof value !== "string" || value.length > max) {
    throw new Error("Invalid profile or shipment details");
  }
  return value.trim();
}
export async function handleCommerce(req: Request): Promise<Response> {
  const boundary = cors(req);
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: boundary.headers });
  if (!boundary.permitted) {
    return respond({ error: "Origin not permitted" }, 403);
  }
  if (req.method === "OPTIONS") return respond({ ok: true });
  if (req.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405);
  }
  try {
    const db = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const token = req.headers.get("authorization")?.replace(/^Bearer /i, "");
    if (!token) return respond({ error: "Sign in required" }, 401);
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) return respond({ error: "Sign in required" }, 401);
    const raw = await req.text();
    if (raw.length > 20000) return respond({ error: "Request too large" }, 413);
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return respond({ error: "Invalid JSON" }, 400);
    }
    if (!payload || typeof payload !== "object") {
      return respond({ error: "Invalid request" }, 400);
    }
    const { action } = payload;
    const isAdminAction = [
      "admin-orders",
      "fulfill",
      "catalog-update",
      "admin-catalog",
    ].includes(action);
    const { data: membership, error: membershipError } = await db.from(
      isAdminAction ? "portal_admins" : "customers",
    ).select("user_id").eq("user_id", user.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) {
      return respond({
        error: isAdminAction
          ? "Administrator access required"
          : "Approved customer access required",
      }, 403);
    }
    if (action === "dashboard") {
      const results = await Promise.all([
        db.from("products").select("*").eq("active", true).order("name"),
        db.from("orders").select("*").eq("user_id", user.id).order(
          "created_at",
          { ascending: false },
        ).limit(100),
        db.from("customer_profiles").select("*").eq("user_id", user.id)
          .maybeSingle(),
      ]);
      for (const result of results) if (result.error) throw result.error;
      let profile = results[2].data;
      if (!profile) {
        const { data: request, error } = await db.from("customer_requests")
          .select("name,company,details").eq("email", user.email!).eq(
            "status",
            "approved",
          ).order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (error) throw error;
        profile = {
          full_name: request?.name || "",
          company: request?.company || "",
          phone: request?.details?.phone || "",
        };
      }
      return respond({
        products: results[0].data,
        orders: results[1].data,
        profile: { ...profile, email: user.email },
      });
    }
    if (action === "profile") {
      const { error } = await db.from("customer_profiles").upsert({
        user_id: user.id,
        full_name: text(payload.full_name, 120),
        company: text(payload.company, 160),
        phone: text(payload.phone, 100),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return respond({ ok: true });
    }
    if (action === "checkout") {
      if (
        !uuid.test(payload.request_key) || !Array.isArray(payload.cart) ||
        !payload.cart.length || payload.cart.length > 50
      ) return respond({ error: "Invalid cart" }, 400);
      if (
        payload.cart.some((item: { product_id?: string; quantity?: number }) =>
          !item || !uuid.test(item.product_id || "") ||
          typeof item.quantity !== "number" ||
          !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
          item.quantity > 1000
        )
      ) {
        return respond({
          error: "Enter whole case quantities between 1 and 1000",
        }, 400);
      }
      const { data: order, error } = await db.rpc("create_customer_order", {
        customer_id: user.id,
        request_key: payload.request_key,
        cart: payload.cart,
        customer_origin: boundary.origin,
      });
      if (error) return respond({ error: error.message }, 400);
      if (order.payment_status !== "pending") {
        return respond({
          error:
            "This checkout is already paid or expired. Refresh your orders.",
        }, 409);
      }
      if (
        order.items.some((item: { is_placeholder: boolean }) =>
          item.is_placeholder
        ) && !requiredEnv("STRIPE_SECRET_KEY").startsWith("sk_test_")
      ) {
        return respond({
          error:
            "Placeholder drinks require a Stripe test key. Configure real products before accepting live payments.",
        }, 400);
      }
      const params = new URLSearchParams({
        mode: "payment",
        customer_email: user.email!,
        success_url: `${order.checkout_origin}/account/orders?checkout=success`,
        cancel_url:
          `${order.checkout_origin}/account/orders?checkout=cancelled`,
        "metadata[order_id]": order.id,
        "metadata[user_id]": user.id,
        client_reference_id: order.id,
        "payment_method_types[0]": "card",
        "shipping_address_collection[allowed_countries][0]": "CA",
      });
      order.items.forEach(
        (
          item: {
            name: string;
            price_cents: number;
            quantity: number;
            cans_per_case: number;
          },
          index: number,
        ) => {
          params.set(`line_items[${index}][quantity]`, String(item.quantity));
          params.set(`line_items[${index}][price_data][currency]`, "cad");
          params.set(
            `line_items[${index}][price_data][unit_amount]`,
            String(item.price_cents),
          );
          params.set(
            `line_items[${index}][price_data][product_data][name]`,
            `${item.name} · ${item.cans_per_case} cans / case`,
          );
        },
      );
      // Existing sessions are retrieved, keeping retries stable even if the browser origin changes.
      const session = order.stripe_session_id
        ? await stripeRequest(`checkout/sessions/${order.stripe_session_id}`)
        : await stripeRequest("checkout/sessions", params, order.id);
      if (session.status !== "open" || !session.url) {
        return respond({
          error: "Checkout is complete or expired. Refresh your orders.",
        }, 409);
      }
      const { error: saveError } = await db.from("orders").update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      if (saveError) throw saveError;
      return respond({ url: session.url, order_id: order.id });
    }
    if (action === "admin-orders") {
      const { data, error } = await db.from("orders").select(
        "*,customers(email)",
      ).order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return respond({ orders: data });
    }
    if (action === "fulfill") {
      if (
        !uuid.test(payload.id) ||
        !["received", "processing", "shipped", "delivered"].includes(
          payload.status,
        )
      ) return respond({ error: "Invalid fulfillment update" }, 400);
      const tracking = text(payload.tracking_url || "", 2000);
      if (tracking && new URL(tracking).protocol !== "https:") {
        return respond({ error: "Tracking links must use HTTPS" }, 400);
      }
      const { data, error } = await db.from("orders").update({
        fulfillment_status: payload.status,
        carrier: text(payload.carrier || "", 120),
        tracking_number: text(payload.tracking_number || "", 200),
        tracking_url: tracking,
        updated_at: new Date().toISOString(),
      }).eq("id", payload.id).eq("payment_status", "paid").select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return respond({ error: "Only paid orders can be fulfilled" }, 409);
      }
      return respond({ ok: true });
    }
    if (action === "admin-catalog") {
      const { data, error } = await db.from("products").select("*").order(
        "name",
      );
      if (error) throw error;
      return respond({ products: data });
    }
    if (action === "catalog-update") {
      if (
        !uuid.test(payload.id) || !Number.isInteger(payload.price_cents) ||
        payload.price_cents < 1 || payload.price_cents > 1000000 ||
        !Number.isInteger(payload.cans_per_case) || payload.cans_per_case < 1 ||
        payload.cans_per_case > 100 || typeof payload.active !== "boolean" ||
        typeof payload.is_placeholder !== "boolean"
      ) return respond({ error: "Invalid product values" }, 400);
      const name = text(payload.name, 120);
      if (!name) return respond({ error: "Product name is required" }, 400);
      const { error } = await db.from("products").update({
        name,
        description: text(payload.description, 1000),
        price_cents: payload.price_cents,
        cans_per_case: payload.cans_per_case,
        active: payload.active,
        is_placeholder: payload.is_placeholder,
      }).eq("id", payload.id);
      if (error) throw error;
      return respond({ ok: true });
    }
    return respond({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(
      "Commerce operation failed",
      error instanceof Error ? error.message : "Database operation failed",
    );
    return respond({
      error: "Unable to complete this request. Please try again.",
    }, 500);
  }
}
if (import.meta.main) Deno.serve(handleCommerce);
