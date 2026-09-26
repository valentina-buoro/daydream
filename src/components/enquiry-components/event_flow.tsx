/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import FormField from './form_field'
import OptionCards from './option_cards'
import StepHeader from './step_header'
//import { submitEventRequest } from '../../lib/applications'

const eventTypes = [
  { value: 'wedding', label: 'Wedding', icon: '♡' },
  { value: 'festival', label: 'Festival', icon: '✦' },
  { value: 'corporate', label: 'Corporate', icon: '▦' },
  { value: 'fitness-wellness', label: 'Fitness / Wellness', icon: '◌' },
  { value: 'party-social', label: 'Party / Social', icon: '☼' },
  { value: 'other', label: 'Other', icon: '+' },
]

const useOptions = [
  { value: 'sampling', label: 'Sampling', icon: '◫' },
  { value: 'selling-cans', label: 'Selling cans', icon: '$' },
  { value: 'mocktails-bar', label: 'Mocktails / bar', icon: '◇' },
  { value: 'other', label: 'Something else', icon: '+' },
]

const partnershipOptions = [
  { value: 'purchase', label: 'I have a budget to purchase product' },
  { value: 'special-pricing', label: 'Product discount / special event pricing' },
  { value: 'in-kind-only', label: 'In-kind product only' },
  { value: 'unsure', label: "I'm not sure yet" },
]

const initialForm = {
  eventName: '', eventType: '', eventDate: '', expectedAttendance: '', cansRequested: '', intendedUse: '',
  partnershipType: '', websiteOrSocial: '', notes: '', firstName: '', lastName: '', email: '', phone: '',
}
export default function EventFlow({ onBack }:any) {
  const [form, setForm] = useState(initialForm)
  //const [submitted, setSubmitted] = useState(false)
  const [loading] = useState(false)
  const [error] = useState('')
  const update = (field:any, value:any) => setForm((current) => ({ ...current, [field]: value }))

  const canSubmit = form.eventName && form.eventType && form.eventDate && Number(form.expectedAttendance) > 0 && Number(form.cansRequested) > 0 && form.intendedUse && form.partnershipType && form.firstName && form.lastName && form.email

  /*const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await submitEventRequest(form)
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <section className="result-page"><div className="result-card"><div className="success-mark">✦</div><p className="eyebrow">REQUEST RECEIVED</p><h1>Thanks for thinking of Daydream.</h1><p>Our sampling budget for the year is closed. If approved, our partnerships team will follow up with a special offer for event sales.</p><p className="muted-note">No further action is needed.</p><button className="secondary-btn wide" onClick={onBack}>Back to Daydream</button></div></section>
    )
  }
*/
  return (
    <section className="form-page">
      <button className="back-link" onClick={onBack}>← Back</button>
      <div className="form-card event-form-card">
        <form onSubmit={()=>{}}>
          <StepHeader eyebrow="EVENTS & PARTNERSHIPS" title="Tell us what you're planning" description="Share a few details and our partnerships team will review the request." />
          <div className="form-stack">
            <FormField label="Event name"><input value={form.eventName} onChange={(e) => update('eventName', e.target.value)} placeholder="Sunday Social" autoFocus /></FormField>
            <div className="field"><span className="field-label">Event type</span><OptionCards options={eventTypes} value={form.eventType} onChange={(value:any) => update('eventType', value)} columns={3} /></div>
            <div className="two-column">
              <FormField label="Event date"><input type="date" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} /></FormField>
              <FormField label="Expected turnout"><input type="number" min="1" value={form.expectedAttendance} onChange={(e) => update('expectedAttendance', e.target.value)} placeholder="250" /></FormField>
            </div>
            <FormField label="How many cans are you looking for?"><input type="number" min="1" value={form.cansRequested} onChange={(e) => update('cansRequested', e.target.value)} placeholder="120" /></FormField>
            <div className="field"><span className="field-label">How will Daydream be used?</span><OptionCards options={useOptions} value={form.intendedUse} onChange={(value:any) => update('intendedUse', value)} columns={2} /></div>
            <div className="field"><span className="field-label">What are you looking for?</span><OptionCards options={partnershipOptions} value={form.partnershipType} onChange={(value:any) => update('partnershipType', value)} columns={1} /></div>
            <FormField label="Event website or social media" hint="Optional"><input value={form.websiteOrSocial} onChange={(e) => update('websiteOrSocial', e.target.value)} placeholder="https://instagram.com/yourevent" /></FormField>
            <FormField label="Anything else we should know?" hint="Optional"><textarea rows={4} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Tell us a little more about the event…" /></FormField>
            <div className="section-divider"><span>CONTACT</span></div>
            <div className="two-column"><FormField label="First name"><input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></FormField><FormField label="Last name"><input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></FormField></div>
            <div className="two-column"><FormField label="Email"><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></FormField><FormField label="Phone" hint="Optional"><input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></FormField></div>
            {error && <p className="form-error">{error}</p>}
          </div>
          <div className="form-actions"><button className="primary-btn" disabled={!canSubmit || loading}>{loading ? 'Submitting…' : 'Submit event request →'}</button></div>
        </form>
      </div>
    </section>
  )
}
