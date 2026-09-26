
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import FormField from './form_field'
import OptionCards from './option_cards'
import StepHeader from './step_header'
import { submitWholesaleApplication } from '../../lib/applications'
import './styles.css'

const businessTypes = [
  { value: 'coffee-shop', label: 'Coffee shop', icon: '☕' },
  { value: 'grocery-market', label: 'Grocery / Market', icon: '◫' },
  { value: 'fitness-wellness', label: 'Fitness / Wellness', icon: '◌' },
  { value: 'restaurant', label: 'Restaurant', icon: '◇' },
  { value: 'hotel-hospitality', label: 'Hotel / Hospitality', icon: '⌂' },
  { value: 'office-workplace', label: 'Office / Workplace', icon: '▦' },
  { value: 'retail-store', label: 'Retail store', icon: '□' },
  { value: 'bar-cafe', label: 'Bar / Café', icon: '◡' },
  { value: 'other', label: 'Other', icon: '+' },
]

const initialForm = {
  businessName: '', businessType: '', locationCount: '1', region: '', currentSupplier: '',
  website: '', instagram: '', otherSocial: '', monthlyCaseVolume: '', firstName: '', lastName: '',
  email: '', phone: '',
}

const distributors = [
  { name: 'Distributor One', detail: 'Replace with your preferred regional partner', url: '#' },
  { name: 'Distributor Two', detail: 'Replace with your preferred regional partner', url: '#' },
  { name: 'Distributor Three', detail: 'Replace with your preferred regional partner', url: '#' },
]

export default function WholesaleFlow({ onBack }:any) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field:any, value:any) => setForm((current) => ({ ...current, [field]: value }))

  const canContinueStep1 = form.businessName && form.businessType && Number(form.locationCount) > 0 && form.region
  const canContinueStep2 = true
  const canSubmit = Number(form.monthlyCaseVolume) >= 0 && form.firstName && form.lastName && form.email

  const handleSubmit = async (event:any) => {
    event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const nextStatus = await submitWholesaleApplication(form)
      setStatus(nextStatus)
    } catch (err:any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status) {
    return <WholesaleResult status={status} name={form.firstName} onBack={onBack} />
  }

  return (
    <section className="form-page">
      <button className="back-link" onClick={step === 1 ? onBack : () => setStep(step - 1)}>← Back</button>

      <div className="form-card">
        {step === 1 && (
          <>
            <StepHeader eyebrow="WHOLESALE" title="Tell us about your business" description="A few basics help us understand whether direct wholesale is the best fit." step={1} total={3} />
            <div className="form-stack">
              <FormField label="Business name">
                <input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="Morning People Café" autoFocus />
              </FormField>

              <div className="field">
                <span className="field-label">What kind of business is it?</span>
                <OptionCards options={businessTypes} value={form.businessType} onChange={(value:any) => update('businessType', value)} columns={3} />
              </div>

              <div className="two-column">
                <FormField label="Number of locations">
                  <input type="number" min="1" value={form.locationCount} onChange={(e) => update('locationCount', e.target.value)} />
                </FormField>
                <FormField label="Region / Province / State">
                  <input value={form.region} onChange={(e) => update('region', e.target.value)} placeholder="Ontario" />
                </FormField>
              </div>

              <FormField label="Current beverage supplier" hint="Optional">
                <input value={form.currentSupplier} onChange={(e) => update('currentSupplier', e.target.value)} placeholder="e.g. Sysco" />
              </FormField>
            </div>
            <div className="form-actions"><button className="primary-btn" disabled={!canContinueStep1} onClick={() => setStep(2)}>Continue →</button></div>
          </>
        )}

        {step === 2 && (
          <>
            <StepHeader eyebrow="WHOLESALE" title="Help us find you online" description="This helps our team quickly verify your business. These fields are optional." step={2} total={3} />
            <div className="form-stack">
              <FormField label="Business website" hint="Optional">
                <input type="url" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://yourbusiness.com" />
              </FormField>
              <FormField label="Instagram" hint="Optional">
                <input value={form.instagram} onChange={(e) => update('instagram', e.target.value)} placeholder="@yourbusiness" />
              </FormField>
              <FormField label="TikTok / other social" hint="Optional">
                <input value={form.otherSocial} onChange={(e) => update('otherSocial', e.target.value)} placeholder="@yourbusiness" />
              </FormField>
            </div>
            <div className="form-actions split"><button className="secondary-btn" onClick={() => setStep(1)}>Back</button><button className="primary-btn" disabled={!canContinueStep2} onClick={() => setStep(3)}>Continue →</button></div>
          </>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit}>
            <StepHeader eyebrow="WHOLESALE" title="Almost there" description="Tell us what you expect to order and where we should reach you." step={3} total={3} />
            <div className="form-stack">
              <FormField label="Expected monthly case volume" hint="Enter your best estimate as a number of cases per month.">
                <input type="number" min="0" value={form.monthlyCaseVolume} onChange={(e) => update('monthlyCaseVolume', e.target.value)} placeholder="24" autoFocus />
              </FormField>

              <div className="section-divider"><span>YOUR CONTACT INFORMATION</span></div>
              <div className="two-column">
                <FormField label="First name"><input value={form.firstName} onChange={(e) => update('firstName', e.target.value)} /></FormField>
                <FormField label="Last name"><input value={form.lastName} onChange={(e) => update('lastName', e.target.value)} /></FormField>
              </div>
              <div className="two-column">
                <FormField label="Business email"><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@business.com" /></FormField>
                <FormField label="Phone" hint="Optional"><input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></FormField>
              </div>
              {error && <p className="form-error">{error}</p>}
            </div>
            <div className="form-actions split"><button type="button" className="secondary-btn" onClick={() => setStep(2)}>Back</button><button className="primary-btn" disabled={!canSubmit || loading}>{loading ? 'Submitting…' : 'Submit application →'}</button></div>
          </form>
        )}
      </div>
    </section>
  )
}

function WholesaleResult({ status, name, onBack }:any) {
  if (status === 'distributor-referred') {
    return (
      <section className="result-page">
        <div className="result-card">
          <div className="success-mark">✓</div>
          <p className="eyebrow">THANKS, {name.toUpperCase()}</p>
          <h1>Our distributor network is the best fit.</h1>
          <p>For orders under 10 cases per month, you can purchase Daydream through one of our distributor partners. No wholesale account has been created.</p>
          <div className="distributor-list">
            {distributors.map((item) => <a href={item.url} key={item.name} className="distributor-row"><span><strong>{item.name}</strong><small>{item.detail}</small></span><span>↗</span></a>)}
          </div>
          <button className="secondary-btn wide" onClick={onBack}>Back to Daydream</button>
        </div>
      </section>
    )
  }

  if (status === 'high-volume-wholesale') {
    return (
      <section className="result-page"><div className="result-card"><div className="success-mark">✦</div><p className="eyebrow">HIGH-VOLUME WHOLESALE</p><h1>Looks like you're planning something big.</h1><p>Based on your expected volume, our wholesale team will review your application for pricing, fulfilment and delivery options. They'll follow up directly using the contact information you provided.</p><button className="secondary-btn wide" onClick={onBack}>Back to Daydream</button></div></section>
    )
  }

  return (
    <section className="result-page"><div className="result-card"><div className="success-mark">✓</div><p className="eyebrow">APPLICATION RECEIVED</p><h1>You're on the list, {name}.</h1><p>We'll review your business and follow up within 1–2 business days. If approved, we'll email you an invitation to activate your wholesale account.</p><div className="benefit-row"><span>Wholesale pricing</span><span>Place orders</span><span>Track shipments</span><span>Order history</span></div><button className="secondary-btn wide" onClick={onBack}>Back to Daydream</button></div></section>
  )
}
