import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { ClientOnboarding } from '@/types'

export function useClientId(profileId: string | null) {
  const [clientId, setClientId] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState<ClientOnboarding | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!profileId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select('id, onboarding')
      .eq('profile_id', profileId)
      .single()
    setClientId(data?.id ?? null)
    setOnboarding(data?.onboarding ?? null)
    setLoading(false)
  }, [profileId])

  useEffect(() => { fetch() }, [fetch])

  return { clientId, onboarding, loading, refetch: fetch }
}
