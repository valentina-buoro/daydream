import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type WholesaleApplicationStatus =
  | 'distributor-referred'
  | 'high-volume-wholesale'
  | 'wholesale-pending'

export interface WholesaleApplicationForm {
  businessName: string
  businessType: string
  locationCount: string | number
  region: string
  currentSupplier: string
  monthlyCaseVolume: string | number
  website: string
  instagram: string
  otherSocial: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface EventRequestForm {
  eventName: string
  eventType: string
  eventDate: string
  expectedAttendance: string | number
  cansRequested: string | number
  intendedUse: string
  partnershipType: string
  websiteOrSocial: string
  notes: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.'
    )
  }

  return supabase
}

export async function submitWholesaleApplication(
  form: WholesaleApplicationForm
): Promise<WholesaleApplicationStatus> {
  const client = getSupabase()

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

  const { error } = await client
    .from('wholesale_applications')
    .insert(payload)

  if (error) {
    throw error
  }

  const volume = Number(form.monthlyCaseVolume)

  if (volume < 10) {
    return 'distributor-referred'
  }

  if (volume > 180) {
    return 'high-volume-wholesale'
  }

  return 'wholesale-pending'
}

export async function submitEventRequest(
  form: EventRequestForm
): Promise<void> {
  const client = getSupabase()

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

  const { error } = await client.from('event_requests').insert(payload)

  if (error) {
    throw error
  }
}