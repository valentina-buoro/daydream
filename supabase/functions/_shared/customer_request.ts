import type { BusinessRequestDetails, EventRequestDetails, CustomerRequestSubmission } from '../../../src/types/enquiry_types.ts';

export class RequestValidationError extends Error {}

function text(value: unknown, max = 500, required = true): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new RequestValidationError('Please complete all required fields within their length limits.');
  }
  return value.trim();
}
function quantity(value: unknown, min: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) {
    throw new RequestValidationError('Enter valid whole-number quantities.');
  }
  return value;
}

// Runtime validation is required: a TypeScript type cannot validate an HTTP payload.
export function parseCustomerRequest(payload: Record<string, unknown>): CustomerRequestSubmission {
  const value = payload.details;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestValidationError('Missing request details.');
  const details = value as Record<string, unknown>;
  const email = text(details.email, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new RequestValidationError('Enter a valid email.');
  const contact = {
    firstName: text(details.firstName, 60), lastName: text(details.lastName, 59), email,
    phone: text(details.phone ?? '', 100, false),
  };
  if (payload.kind === 'business') {
    const business: BusinessRequestDetails = {
      ...contact,
      businessName: text(details.businessName, 160), businessType: text(details.businessType),
      locationCount: quantity(details.locationCount, 1), region: text(details.region),
      currentSupplier: text(details.currentSupplier ?? '', 500, false),
      monthlyCaseVolume: quantity(details.monthlyCaseVolume, 0),
      website: text(details.website ?? '', 2000, false), instagram: text(details.instagram ?? '', 500, false),
      otherSocial: text(details.otherSocial ?? '', 500, false),
    };
    return { kind: 'business', details: business };
  }
  if (payload.kind === 'event') {
    const date = text(details.eventDate, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new RequestValidationError('Enter a valid event date.');
    const event: EventRequestDetails = {
      ...contact, eventName: text(details.eventName, 160), eventType: text(details.eventType), eventDate: date,
      expectedAttendance: quantity(details.expectedAttendance, 1), cansRequested: quantity(details.cansRequested, 1),
      intendedUse: text(details.intendedUse), partnershipType: text(details.partnershipType),
      websiteOrSocial: text(details.websiteOrSocial ?? '', 2000, false), notes: text(details.notes ?? '', 2000, false),
    };
    return { kind: 'event', details: event };
  }
  throw new RequestValidationError('Choose business or event.');
}

export function customerRequestRow(submission: CustomerRequestSubmission): { kind: CustomerRequestSubmission['kind']; details: BusinessRequestDetails | EventRequestDetails; email: string; name: string; company: string; message: string } {
  const { details } = submission;
  return {
    ...submission, email: details.email, name: `${details.firstName} ${details.lastName}`,
    company: submission.kind === 'business' ? submission.details.businessName : submission.details.eventName,
    message: submission.kind === 'event' ? submission.details.notes : '',
  };
}
