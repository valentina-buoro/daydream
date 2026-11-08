import { handleCommerce } from "./index.ts";
function assert(value: unknown): asserts value {
  if (!value) throw new Error("Assertion failed");
}
const product = "00000000-0000-0000-0000-000000000010";
const orderId = "00000000-0000-0000-0000-000000000020";
Deno.test("commerce authorizes customers and freezes server-side prices for checkout", async (t) => {
  for (
    const [key, value] of Object.entries({
      APP_URL: "https://app.example.com",
      SUPABASE_URL: "https://project.example.com",
      SUPABASE_SERVICE_ROLE_KEY: "service",
      STRIPE_SECRET_KEY: "sk_test_example",
    })
  ) Deno.env.set(key, value);
  const original = globalThis.fetch;
  let eligible = true;
  let admin = false;
  let stripeBody = new URLSearchParams();
  let fulfillmentPaidOnly = false;
  let reserved = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    if (url.includes("/auth/v1/user")) {
      return json({ id: "customer", email: "customer@example.com" });
    }
    if (url.includes("/portal_admins")) {
      return json(admin ? { user_id: "customer" } : null);
    }
    if (url.includes("/customers")) {
      return json(eligible ? { user_id: "customer" } : null);
    }
    if (url.includes("/rpc/create_customer_order")) {
      const body = JSON.parse(String(init?.body));
      reserved = true;
      if (
        body.cart.reduce(
          (sum: number, item: { quantity: number }) => sum + item.quantity,
          0,
        ) < 10
      ) return json({ message: "Minimum order is 10 cases" }, 400);
      return json({
        id: orderId,
        checkout_origin: "https://app.example.com",
        payment_status: "pending",
        items: [{
          product_id: product,
          name: "Drink",
          price_cents: 3600,
          quantity: 10,
          cans_per_case: 12,
          is_placeholder: true,
        }],
      });
    }
    if (url.includes("api.stripe.com")) {
      stripeBody = new URLSearchParams(String(init?.body));
      return json({
        id: "cs_test",
        url: "https://checkout.stripe.com/test",
        status: "open",
      });
    }
    if (url.includes("/orders")) {
      fulfillmentPaidOnly = url.includes("payment_status=eq.paid");
      return json({ id: orderId });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  };
  const request = (body: unknown, auth = true) =>
    new Request("https://example.com", {
      method: "POST",
      headers: {
        origin: "https://app.example.com",
        ...(auth ? { Authorization: "Bearer token" } : {}),
      },
      body: JSON.stringify(body),
    });
  const cart = {
    action: "checkout",
    request_key: orderId,
    cart: [{ product_id: product, quantity: 10 }],
    total_cents: 1,
  };
  try {
    await t.step("anonymous checkout is rejected", async () => {
      assert((await handleCommerce(request(cart, false))).status === 401);
      assert(!reserved);
    });
    await t.step("unapproved accounts are rejected", async () => {
      eligible = false;
      assert((await handleCommerce(request(cart))).status === 403);
      eligible = true;
    });
    await t.step("under-minimum carts fail before Stripe", async () => {
      assert(
        (await handleCommerce(
          request({ ...cart, cart: [{ product_id: product, quantity: 9 }] }),
        )).status === 400,
      );
      assert(!stripeBody.has("mode"));
    });
    await t.step(
      "Stripe receives catalog price and fixed return URLs",
      async () => {
        const response = await handleCommerce(request(cart));
        assert(response.status === 200);
        assert(
          stripeBody.get("line_items[0][price_data][unit_amount]") === "3600",
        );
        assert(stripeBody.get("line_items[0][quantity]") === "10");
        assert(
          stripeBody.get("success_url") ===
            "https://app.example.com/account/orders?checkout=success",
        );
      },
    );
    await t.step("placeholder products cannot charge live cards", async () => {
      Deno.env.set("STRIPE_SECRET_KEY", "sk_live_example");
      assert((await handleCommerce(request(cart))).status === 400);
      Deno.env.set("STRIPE_SECRET_KEY", "sk_test_example");
    });
    await t.step("customers cannot access fulfillment management", async () => {
      assert(
        (await handleCommerce(request({ action: "admin-orders" }))).status ===
          403,
      );
    });
    await t.step("shipment updates require a paid order", async () => {
      admin = true;
      assert(
        (await handleCommerce(
          request({
            action: "fulfill",
            id: orderId,
            status: "shipped",
            tracking_url: "https://carrier.example/track",
          }),
        )).status === 200,
      );
      assert(fulfillmentPaidOnly);
    });
    await t.step("unsafe shipment links are rejected", async () => {
      assert(
        (await handleCommerce(
          request({
            action: "fulfill",
            id: orderId,
            status: "shipped",
            tracking_url: "javascript:alert(1)",
          }),
        )).status === 400,
      );
    });
  } finally {
    globalThis.fetch = original;
  }
});
