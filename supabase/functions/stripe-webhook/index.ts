import { createClient } from "npm:@supabase/supabase-js@2";
import { requiredEnv, verifyStripeSignature } from "../_shared/commerce.ts";
export async function handleStripeWebhook(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const raw = await req.text();
  if (raw.length > 1000000) {
    return new Response("Payload too large", { status: 413 });
  }
  if (
    !await verifyStripeSignature(
      raw,
      req.headers.get("stripe-signature"),
      requiredEnv("STRIPE_WEBHOOK_SECRET"),
    )
  ) return new Response("Invalid signature", { status: 400 });
  try {
    const event = JSON.parse(raw);
    if (
      !["checkout.session.completed", "checkout.session.expired"].includes(
        event.type,
      )
    ) return new Response("Ignored");
    const session = event.data.object;
    if (
      event.type === "checkout.session.completed" &&
      session.payment_status !== "paid"
    ) return new Response("Awaiting payment");
    if (!session.metadata?.order_id) return new Response("Unrelated checkout");
    const db = createClient(
      requiredEnv("SUPABASE_URL"),
      requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } },
    );
    const { error } = await db.rpc("apply_order_payment", {
      event_id: event.id,
      order_id: session.metadata.order_id,
      session_id: session.id,
      amount: session.amount_total,
      payment_currency: session.currency,
      payment_intent: session.payment_intent || null,
      shipping: session.shipping_details ||
        session.collected_information?.shipping_details || null,
      event_kind: event.type === "checkout.session.expired"
        ? "expired"
        : "paid",
    });
    if (error) throw error;
    return new Response("OK");
  } catch {
    console.error("Stripe event could not be recorded");
    return new Response("Unable to record event", { status: 500 });
  }
}
if (import.meta.main) Deno.serve(handleStripeWebhook);
