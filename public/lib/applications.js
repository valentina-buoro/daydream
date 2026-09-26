import { supabase } from './supabase'

const assertSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.')
  }
}

export async function submitWholesaleApplication(form) {
  assertSupabase()

  const payload = {
    business_name: form.businessName.trim(),
    business_type: form.businessType,
    location_count: Number(form.locationCount),
    region: form.region.trim(),
    current_supplier: form.currentSupplier.trim() || null,
    monthly_case_volume: Number(form.monthlyCaseVolume),
    website: form.website.trim() || null,
    instagram: form.instagram.trim() || null,
    other_social: form.otherSocial.trim() || null,
    contact_first_name: form.firstName.trim(),
    contact_last_name: form.lastName.trim(),
    contact_email: form.email.trim().toLowerCase(),
    contact_phone: form.phone.trim() || null,
  }

  const { error } = await supabase.from('wholesale_applications').insert(payload)
  if (error) throw error

  const volume = Number(form.monthlyCaseVolume)
  if (volume < 10) return 'distributor-referred'
  if (volume > 180) return 'high-volume-wholesale'
  return 'wholesale-pending'
}

export async function submitEventRequest(form) {
  assertSupabase()

  const payload = {
    event_name: form.eventName.trim(),
    event_type: form.eventType,
    event_date: form.eventDate,
    expected_attendance: Number(form.expectedAttendance),
    cans_requested: Number(form.cansRequested),
    intended_use: form.intendedUse,
    partnership_type: form.partnershipType,
    website_or_social: form.websiteOrSocial.trim() || null,
    notes: form.notes.trim() || null,
    contact_first_name: form.firstName.trim(),
    contact_last_name: form.lastName.trim(),
    contact_email: form.email.trim().toLowerCase(),
    contact_phone: form.phone.trim() || null,
  }

  const { error } = await supabase.from('event_requests').insert(payload)
  if (error) throw error
}
