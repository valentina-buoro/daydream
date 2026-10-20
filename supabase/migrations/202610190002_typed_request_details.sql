-- Preserve existing requests while aligning JSON keys with enquiry_types.ts.
update public.customer_requests r
set details = (
  select coalesce(jsonb_object_agg(
    case key
      when 'business_name' then 'businessName'
      when 'business_type' then 'businessType'
      when 'location_count' then 'locationCount'
      when 'current_supplier' then 'currentSupplier'
      when 'monthly_case_volume' then 'monthlyCaseVolume'
      when 'other_social' then 'otherSocial'
      when 'contact_first_name' then 'firstName'
      when 'contact_last_name' then 'lastName'
      when 'contact_email' then 'email'
      when 'contact_phone' then 'phone'
      when 'event_name' then 'eventName'
      when 'event_type' then 'eventType'
      when 'event_date' then 'eventDate'
      when 'expected_attendance' then 'expectedAttendance'
      when 'cans_requested' then 'cansRequested'
      when 'intended_use' then 'intendedUse'
      when 'partnership_type' then 'partnershipType'
      when 'website_or_social' then 'websiteOrSocial'
      else key
    end,
    case when value = 'null'::jsonb then '""'::jsonb else value end
  ), '{}'::jsonb)
  from jsonb_each(r.details)
);

-- Historical/incomplete rows remain readable. Every new/updated row is checked.
-- NOT VALID avoids discarding historical rows with missing form fields.
alter table public.customer_requests add constraint customer_requests_typed_details check (
  jsonb_typeof(details) = 'object'
  and details ?& array['firstName', 'lastName', 'email', 'phone']
  and jsonb_typeof(details->'firstName') = 'string'
  and jsonb_typeof(details->'lastName') = 'string'
  and jsonb_typeof(details->'email') = 'string'
  and jsonb_typeof(details->'phone') = 'string'
  and details->>'email' = email
  and name = (details->>'firstName') || ' ' || (details->>'lastName')
  and (
    (kind = 'business'
      and details ?& array['businessName', 'businessType', 'locationCount', 'region', 'currentSupplier', 'monthlyCaseVolume', 'website', 'instagram', 'otherSocial']
      and company = details->>'businessName'
      and jsonb_typeof(details->'locationCount') = 'number'
      and jsonb_typeof(details->'monthlyCaseVolume') = 'number')
    or
    (kind = 'event'
      and details ?& array['eventName', 'eventType', 'eventDate', 'expectedAttendance', 'cansRequested', 'intendedUse', 'partnershipType', 'websiteOrSocial', 'notes']
      and company = details->>'eventName'
      and message = details->>'notes'
      and jsonb_typeof(details->'expectedAttendance') = 'number'
      and jsonb_typeof(details->'cansRequested') = 'number')
  )
) not valid;
