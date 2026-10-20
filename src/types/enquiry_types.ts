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

export type WholesaleApplicationStatus =
  | 'distributor-referred'
  | 'high-volume-wholesale'
  | 'wholesale-pending'


export type CustomerRequestStatus = 'pending' | 'approved' | 'denied'

// Form inputs accept strings; saved quantities are always numbers.
export type BusinessRequestDetails = Omit<WholesaleApplicationForm, 'locationCount' | 'monthlyCaseVolume'> & {
  locationCount: number
  monthlyCaseVolume: number
}
export type EventRequestDetails = Omit<EventRequestForm, 'expectedAttendance' | 'cansRequested'> & {
  expectedAttendance: number
  cansRequested: number
}
export type CustomerRequestSubmission =
  | { kind: 'business'; details: BusinessRequestDetails }
  | { kind: 'event'; details: EventRequestDetails }

interface CustomerRequestMetadata {
  id: string
  name: string
  email: string
  company: string
  message: string
  status: CustomerRequestStatus
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  notification_sent: boolean
}
export type CustomerRequest = CustomerRequestMetadata & CustomerRequestSubmission
