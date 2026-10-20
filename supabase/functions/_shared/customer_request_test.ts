import { parseCustomerRequest, customerRequestRow, RequestValidationError } from './customer_request.ts';

function assert(value: unknown): asserts value { if (!value) throw new Error('Assertion failed'); }
const contact = { firstName: ' Ada ', lastName: ' Lovelace ', email: ' ADA@Example.com ', phone: '' };
const business = { kind: 'business', details: { ...contact, businessName: ' Shop ', businessType: 'retail', region: 'Ontario', locationCount: 2, monthlyCaseVolume: 20 } };
const event = { kind: 'event', details: { ...contact, eventName: ' Launch ', eventType: 'corporate', eventDate: '2026-12-01', expectedAttendance: 100, cansRequested: 200, intendedUse: 'sampling', partnershipType: 'purchase' } };
Deno.test('business requests normalize form fields and derive summaries', () => {
  const result = parseCustomerRequest({ ...business, email: 'spoof@example.com', name: 'Spoof' });
  assert(result.kind === 'business');
  assert(result.details.businessName === 'Shop');
  assert(result.details.website === '');
  assert(result.details.email === 'ada@example.com');
  const row = customerRequestRow(result);
  assert(row.name === 'Ada Lovelace' && row.company === 'Shop' && row.email === 'ada@example.com');
});
Deno.test('event requests retain event-specific fields and notes', () => {
  const result = parseCustomerRequest({ ...event, details: { ...event.details, notes: ' Outdoor event ' } });
  assert(result.kind === 'event' && result.details.expectedAttendance === 100);
  const row = customerRequestRow(result);
  assert(row.company === 'Launch' && row.message === 'Outdoor event');
});
Deno.test('rejects missing fields, invalid dates, and invalid quantities', () => {
  for (const payload of [
    { ...business, details: { ...business.details, firstName: '' } },
    { ...business, details: { ...business.details, monthlyCaseVolume: '20' } },
    { ...business, details: { ...business.details, locationCount: -1 } },
    { ...event, details: { ...event.details, eventDate: '2026-02-30' } },
    { ...event, details: { ...event.details, cansRequested: 1.5 } },
  ]) {
    let rejected = false;
    try { parseCustomerRequest(payload); } catch (err) { rejected = err instanceof RequestValidationError; }
    assert(rejected);
  }
});
