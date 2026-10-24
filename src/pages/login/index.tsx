import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { portal } from '../../lib/portal'

export default function Login() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  return <main className="mx-auto my-16 w-full max-w-lg rounded-xl bg-[#fffefa] p-8 text-left text-[#233c34]">
    <h1 className="mb-4 text-3xl">Sign in with an email link</h1>
    <p className="mb-6">Use your approved email address. Administrators can use their admin email.</p>
    <form onSubmit={async (event) => {
      event.preventDefault()
      if (busy) return
      const email = String(new FormData(event.currentTarget).get('email')).trim().toLowerCase()
      setBusy(true); setMessage(''); setError('')
      try {
        await portal({ action: 'login', email, next: params.get('next') === 'admin' ? 'admin' : 'account' })
        setMessage('If your account is eligible, check your inbox for a sign-in link. Please wait at least a minute before requesting another.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to send a link. Please try again shortly.')
      } finally { setBusy(false) }
    }}>
      <label className="block">Email address<input className="mt-2 mb-4 block w-full rounded border border-[#dce0d3] p-3" name="email" type="email" autoComplete="email" required /></label>
      <button className="rounded bg-[#284b3c] px-5 py-3 text-white disabled:opacity-50" disabled={busy}>{busy ? 'Sending…' : 'Send login link'}</button>
    </form>
    {message && <p role="status" className="mt-4">{message}</p>}
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    <Link className="mt-6 block underline" to="/">Back to Daydream</Link>
  </main>
}
