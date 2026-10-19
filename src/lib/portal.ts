import { supabase } from '../../supabase/supabase'

export interface Application {
  id: string
  name: string
  email: string
  company: string
  message: string
  kind: 'business' | 'event'
  details: Record<string, string | number | null>
  status: 'pending' | 'approved' | 'denied'
  created_at: string
  notification_sent: boolean
}

export function getClient() {
  if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  return supabase
}

export async function portal<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await getClient().functions.invoke('portal', { body })
  if (error) {
    let message = error.message
    if (error.context instanceof Response) {
      const result = await error.context.json().catch(() => null)
      message = result?.error || message
    }
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  return data as T
}
