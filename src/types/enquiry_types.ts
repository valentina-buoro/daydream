export interface WholesaleApplicationForm {
  id?: number
  status?: "pending" | "approved" | "denied";
  created_at?: string;
  auth_user_id?: string;
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

export type WholesaleApplicationStatus =
  | 'distributor-referred'
  | 'high-volume-wholesale'
  | 'wholesale-pending'
