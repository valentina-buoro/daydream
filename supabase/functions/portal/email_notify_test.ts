import { handleRequest } from './email_notify.ts';

function assert(value: unknown, message = 'Assertion failed'): asserts value {
  if (!value) throw new Error(message);
}
const email = 'customer@example.com';
const submission = {
  action: 'request', kind: 'business', email, name: 'Test Customer', company: 'Test Shop', message: '',
  details: { email, businessName: 'Test Shop', businessType: 'retail', region: 'Ontario', firstName: 'Test', lastName: 'Customer', locationCount: 1, monthlyCaseVolume: 20 },
};
function request(body: unknown, token?: string) {
  return new Request('https://example.com/functions/v1/portal', { method: 'POST', headers: { origin: 'https://app.example.com', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
}
Deno.test('portal request and authorization boundaries', async (t) => {
  for (const [key, value] of Object.entries({ APP_URL: 'https://app.example.com', ALLOWED_ORIGINS: 'http://localhost:5173', SUPABASE_URL: 'https://project.example.com', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', SUPABASE_ANON_KEY: 'test-anon', RESEND_API_KEY: 'test-resend', EMAIL_FROM: 'team@example.com', ADMIN_EMAIL: 'admin@example.com' })) Deno.env.set(key, value);
  const originalFetch = globalThis.fetch;
  let admin = false;
  let mailFails = false;
  let created = false;
  let finalized = false;
  let sentAfterApproval = false;
  let eligible = true;
  let generatedCount = 0;
  let loginEmailCount = 0;
  let redirectTo = '';
  const actionLink = 'https://project.example.com/auth/v1/verify?token=secret-test-token&type=signup';
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    const method = init?.method || 'GET';
    const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    if (url.includes('/auth/v1/user')) return json({ id: 'admin-id', email: 'admin@example.com' });
    if (url.includes('/portal_admins')) return json(admin ? { user_id: 'admin-id' } : null);
    if (url.includes('/customer_requests') && method === 'POST') { created = true; return json({ ...JSON.parse(String(init?.body)), id: 'request-id' }); }
    if (url.includes('/customer_requests') && method === 'PATCH') return new Response(null, { status: 204 });
    if (url.includes('/customer_requests')) return json({ ...submission, id: 'request-id', status: 'pending' });
    if (url.includes('api.resend.com')) {
      const body = JSON.parse(String(init?.body));
      if (body.subject === 'Your Daydream sign-in link') {
        assert(body.to[0] === email);
        assert(body.text.includes(actionLink));
        loginEmailCount++;
        sentAfterApproval = finalized;
      }
      return json({}, mailFails ? 500 : 200);
    }
    if (url.includes('/admin/generate_link')) {
      generatedCount++;
      redirectTo = new URL(url).searchParams.get('redirect_to') || '';
      return json({ id: 'customer-id', email, email_confirmed_at: null, action_link: actionLink, verification_type: 'signup' });
    }
    if (url.includes('/rpc/reserve_portal_login')) return json(eligible ? 'customer-id' : null);
    if (url.includes('/rpc/finalize_customer_approval')) { finalized = true; return new Response(null, { status: 204 }); }
    if (url.includes('/auth/v1/otp')) throw new Error('Unconfirmed accounts must not use public OTP signup');
    throw new Error(`Unexpected fetch: ${method} ${url}`);
  };
  try {
    await t.step('accepts production and localhost preflights with exact origins', async () => {
      for (const origin of ['https://app.example.com', 'http://localhost:5173']) {
        const response = await handleRequest(new Request('https://example.com', { method: 'OPTIONS', headers: { origin } }));
        assert(response.status === 200);
        assert(response.headers.get('Access-Control-Allow-Origin') === origin);
        assert(response.headers.get('Vary') === 'Origin');
      }
      const response = await handleRequest(new Request('https://example.com', { method: 'OPTIONS', headers: { origin: 'http://localhost:5174' } }));
      assert(response.status === 403);
    });
    await t.step('rejects foreign origins', async () => {
      const response = await handleRequest(new Request('https://example.com', { method: 'POST', headers: { origin: 'https://attacker.example' } }));
      assert(response.status === 403);
    });
    await t.step('validates fields before saving', async () => {
      const response = await handleRequest(request({ ...submission, details: {} }));
      assert(response.status === 400); assert(!created);
    });
    await t.step('saves requests even when notification delivery fails', async () => {
      mailFails = true;
      assert((await handleRequest(request(submission))).status === 200); assert(created);
    });
    await t.step('event requests use the same review and notification flow', async () => {
      const response = await handleRequest(request({ ...submission, kind: 'event', details: { email, eventName: 'Festival', eventType: 'festival', eventDate: '2026-12-01', intendedUse: 'sampling', partnershipType: 'purchase', firstName: 'Test', lastName: 'Customer', expectedAttendance: 200, cansRequested: 100 } }));
      assert(response.status === 200);
    });
    await t.step('anonymous visitors cannot list requests', async () => {
      assert((await handleRequest(request({ action: 'list' }))).status === 401);
    });
    await t.step('customer cannot list or decide requests', async () => {
      for (const action of ['list', 'decide', 'retry-notification']) assert((await handleRequest(request({ action, id: 'request-id', status: 'approved' }, 'customer-token'))).status === 403);
      assert(!finalized);
    });
    await t.step('finalizes approval before sending customer login email', async () => {
      admin = true; mailFails = false;
      const response = await handleRequest(request({ action: 'decide', id: 'request-id', status: 'approved' }, 'admin-token'));
      assert(response.status === 200); assert(finalized); assert(sentAfterApproval);
      assert((await response.json()).email_sent === true);
    });
    await t.step('approved unconfirmed customers receive the generated verification link from login', async () => {
      const before = loginEmailCount;
      const response = await handleRequest(request({ action: 'login', email }));
      assert(response.status === 200 && loginEmailCount === before + 1);
      assert(redirectTo === 'https://app.example.com/account');
      assert(!(await response.text()).includes('secret-test-token'));
    });
    await t.step('localhost admin login uses only the allowed origin and fixed admin path', async () => {
      const response = await handleRequest(new Request('https://example.com', { method: 'POST', headers: { origin: 'http://localhost:5173' }, body: JSON.stringify({ action: 'login', email, next: 'admin', redirectTo: 'https://attacker.example' }) }));
      assert(response.status === 200 && redirectTo === 'http://localhost:5173/admin');
    });
    await t.step('ineligible and cooldown requests never generate or send links', async () => {
      eligible = false;
      const before = generatedCount;
      const response = await handleRequest(request({ action: 'login', email }));
      assert(response.status === 200 && generatedCount === before);
      eligible = true;
    });
    await t.step('failed approval email keeps approval saved', async () => {
      mailFails = true;
      const response = await handleRequest(request({ action: 'decide', id: 'request-id', status: 'approved' }, 'admin-token'));
      assert(response.status === 200 && finalized);
      assert((await response.json()).email_sent === false);
    });
  } finally { globalThis.fetch = originalFetch; }
});
