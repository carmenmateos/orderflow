import { createClient, Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url || '', anonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

let currentSession: Session | null = null

export async function ensureAnonymousSession(): Promise<string | null> {
  if (currentSession?.user?.id) {
    return currentSession.user.id
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user?.id) {
    currentSession = session
    return session.user.id
  }

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) {
    console.error('Error creating anonymous session:', error.message)
    return null
  }

  currentSession = data.session
  return data.user?.id ?? null
}

supabase.auth.onAuthStateChange((_event, session) => {
  currentSession = session
})
