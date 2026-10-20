import { portal } from '../src/lib/portal'
import type { WholesaleApplicationForm, EventRequestForm, WholesaleApplicationStatus, CustomerRequestSubmission } from '../src/types/enquiry_types'

async function submitRequest(request: CustomerRequestSubmission): Promise<void> {
  await portal({ action: 'request', ...request })
}

export async function submitWholesaleApplication(form: WholesaleApplicationForm): Promise<WholesaleApplicationStatus> {
  await submitRequest({ kind: 'business', details: {
    ...form, locationCount: Number(form.locationCount), monthlyCaseVolume: Number(form.monthlyCaseVolume),
  } })
  const volume = Number(form.monthlyCaseVolume)
  if (volume < 10) return 'distributor-referred'
  if (volume > 180) return 'high-volume-wholesale'
  return 'wholesale-pending'
}

export async function submitEventRequest(form: EventRequestForm): Promise<void> {
  await submitRequest({ kind: 'event', details: {
    ...form, expectedAttendance: Number(form.expectedAttendance), cansRequested: Number(form.cansRequested),
  } })
}
