import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

function displayNameFromMetadata(user: User) {
  const metadata = user.user_metadata
  const candidates = [metadata.display_name, metadata.full_name, metadata.name]
  return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim()
}

export function useUserDisplayName(user: User | undefined) {
  const [profileDisplayName, setProfileDisplayName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setProfileDisplayName(null)

    if (!supabase || !user) return

    void supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.display_name?.trim()) setProfileDisplayName(data.display_name.trim())
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return profileDisplayName ?? (user ? displayNameFromMetadata(user) ?? user.email ?? 'Account' : 'Account')
}
