import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Navigate } from 'react-router-dom'
import { getClient } from './portal'
import { supabase } from '../../supabase/supabase'
import type { ReactNode } from 'react'

export function Access({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'signed-out' | 'allowed' | 'denied'>(supabase ? 'loading' : 'denied')
  const [error, setError] = useState(supabase ? '' : 'Supabase is not configured.')
  useEffect(() => {
    let active = true
    let generation = 0
    async function check(session: Session | null) {
      const current = ++generation
      if (!session) { if (active) setState('signed-out'); return }
      const client = getClient()
      const { data, error } = await client.from(admin ? 'portal_admins' : 'customers').select('user_id').eq('user_id', session.user.id).maybeSingle()
      if (!active || current !== generation) return
      if (error) setError(error.message)
      setState(data ? 'allowed' : 'denied')
    }
    if (!supabase) return
    {
      const client = supabase
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        // Run database queries outside the Auth callback's lock.
        setTimeout(() => { if (active) void check(session) }, 0)
      })
      void client.auth.getSession().then(({ data, error }) => {
        if (error && active) { setError(error.message); setState('denied') }
        else if (active) void check(data.session)
      })
      return () => { active = false; subscription.unsubscribe() }
    }
  }, [admin])
  if (state === 'loading') return <p role="status">Checking access…</p>
  if (state === 'signed-out') return <Navigate to={admin ? '/login?next=admin' : '/login'} replace />
  if (state === 'denied') return <main className="mx-auto p-10"><h1>Access unavailable</h1><p role="alert">{error || (admin ? 'This account is not an administrator.' : 'Your account needs an approved request.')}</p><button className="mt-4 underline" onClick={() => { void getClient().auth.signOut() }}>Sign out</button></main>
  return <>{children}</>
}
