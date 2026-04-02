import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useClientId(profileId: string | null) {
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }

    supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profileId)
      .single()
      .then(({ data }) => {
        setClientId(data?.id ?? null)
        setLoading(false)
      })
  }, [profileId])

  return { clientId, loading }
}
