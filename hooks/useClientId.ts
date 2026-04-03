import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { ClientOnboarding } from '@/types'

export function useClientId(profileId: string | null) {
  const [clientId, setClientId] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState<ClientOnboarding | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }

    supabase
      .from('clients')
      .select('id, onboarding')
      .eq('profile_id', profileId)
      .single()
      .then(({ data }) => {
        setClientId(data?.id ?? null)
        setOnboarding(data?.onboarding ?? null)
        setLoading(false)
      })
  }, [profileId])

  return { clientId, onboarding, loading }
}
