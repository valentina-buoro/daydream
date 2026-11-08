export function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
export function cors(req: Request) {
  const origins = [
    requiredEnv("APP_URL"),
    ...(Deno.env.get("ALLOWED_ORIGINS") || "").split(","),
  ].filter(Boolean).map((v) => new URL(v.trim()).origin);
  const origin = req.headers.get("origin");
  return {
    permitted: !origin || origins.includes(origin),
    origin: origin && origins.includes(origin) ? origin : origins[0],
    headers: {
      "Access-Control-Allow-Origin": origin && origins.includes(origin)
        ? origin
        : "null",
      Vary: "Origin",
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Content-Type": "application/json",
    },
  };
}
export async function stripeRequest(
  path: string,
  body?: URLSearchParams,
  idempotencyKey?: string,
) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${requiredEnv("STRIPE_SECRET_KEY")}`,
      "Stripe-Version": "2025-02-24.acacia",
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body,
  });
  const data = await response.json();
  if (!response.ok) {
    console.error("Stripe request failed", {
      status: response.status,
      code: data.error?.code,
    });
    throw new Error("Payment service unavailable. Please try again.");
  }
  return data;
}
export async function verifyStripeSignature(
  body: string,
  signature: string | null,
  secret: string,
  now = Date.now(),
) {
  if (!signature) return false;
  const parts = signature.split(",").map((part) => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  if (
    !timestamp || !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  ) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  for (const [name, hex] of parts) {
    if (name !== "v1" || !/^[a-f0-9]{64}$/i.test(hex)) continue;
    const bytes = Uint8Array.from(
      hex.match(/.{2}/g)!,
      (value) => parseInt(value, 16),
    );
    if (
      await crypto.subtle.verify(
        "HMAC",
        key,
        bytes,
        new TextEncoder().encode(`${timestamp}.${body}`),
      )
    ) return true;
  }
  return false;
}
