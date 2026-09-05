import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { AuthContext } from './AuthContext'
import type { Session } from '@supabase/supabase-js'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase?.auth.signOut()
  }

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>
}
