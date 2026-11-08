import { verifyStripeSignature } from "./commerce.ts";
function assert(value: unknown): asserts value {
  if (!value) throw new Error("Assertion failed");
}
async function sign(body: string, time: number, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${time}.${body}`),
    ),
  );
  return `t=${time},v1=${
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  }`;
}
Deno.test("Stripe signatures accept valid raw payloads and reject tampering and stale requests", async () => {
  const now = Date.now();
  const body = '{"type":"checkout.session.completed"}';
  const secret = "whsec_test";
  const signature = await sign(body, Math.floor(now / 1000), secret);
  assert(await verifyStripeSignature(body, signature, secret, now));
  assert(!await verifyStripeSignature(body + " ", signature, secret, now));
  assert(!await verifyStripeSignature(body, signature, "wrong", now));
  assert(!await verifyStripeSignature(body, signature, secret, now + 301000));
  assert(!await verifyStripeSignature(body, null, secret, now));
});
