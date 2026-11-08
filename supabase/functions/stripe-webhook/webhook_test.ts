import { handleStripeWebhook } from "./index.ts";
function assert(value: unknown): asserts value {
  if (!value) throw new Error("Assertion failed");
}
async function signature(body: string) {
  const time = Math.floor(Date.now() / 1000);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("whsec_test"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hash = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${time}.${body}`),
    ),
  );
  return `t=${time},v1=${
    Array.from(hash, (v) => v.toString(16).padStart(2, "0")).join("")
  }`;
}
Deno.test("webhooks verify signatures and only record confirmed payments", async (t) => {
  Deno.env.set("STRIPE_WEBHOOK_SECRET", "whsec_test");
  Deno.env.set("SUPABASE_URL", "https://project.example.com");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service");
  const original = globalThis.fetch;
  let records = 0;
  let eventKind = "";
  let fail = false;
  globalThis.fetch = async (_input, init) => {
    records++;
    eventKind = JSON.parse(String(init?.body)).event_kind;
    return new Response(
      JSON.stringify(fail ? { message: "DB unavailable" } : null),
      {
        status: fail ? 500 : 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };
  const event = {
    id: "evt_test",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test",
        payment_status: "paid",
        amount_total: 36000,
        currency: "cad",
        payment_intent: "pi_test",
        metadata: { order_id: "00000000-0000-0000-0000-000000000020" },
      },
    },
  };
  async function call(value: unknown) {
    const body = JSON.stringify(value);
    return handleStripeWebhook(
      new Request("https://example.com", {
        method: "POST",
        headers: { "stripe-signature": await signature(body) },
        body,
      }),
    );
  }
  try {
    await t.step("unsigned requests never touch orders", async () => {
      assert(
        (await handleStripeWebhook(
          new Request("https://example.com", {
            method: "POST",
            body: JSON.stringify(event),
          }),
        )).status === 400,
      );
      assert(records === 0);
    });
    await t.step("unpaid completions never mark an order paid", async () => {
      assert(
        (await call({
          ...event,
          data: { object: { ...event.data.object, payment_status: "unpaid" } },
        })).status === 200,
      );
      assert(records === 0);
    });
    await t.step("verified paid sessions record the payment", async () => {
      assert((await call(event)).status === 200);
      assert(eventKind === "paid");
    });
    await t.step("expired sessions use a separate payment state", async () => {
      assert(
        (await call({ ...event, type: "checkout.session.expired" })).status ===
          200,
      );
      assert(eventKind === "expired");
    });
    await t.step("database failures tell Stripe to retry", async () => {
      fail = true;
      assert((await call(event)).status === 500);
    });
  } finally {
    globalThis.fetch = original;
  }
});
