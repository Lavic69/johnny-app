import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Client, Profile } from '@/types'

export interface ClientWithProfile extends Client {
  profile: Profile
}

interface ClientsState {
  clients: ClientWithProfile[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useClients(coachId: string | null): ClientsState {
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!coachId) { setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('clients')
      .select('*, profile:profiles(*)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setClients((data as ClientWithProfile[]) ?? [])
    setLoading(false)
  }, [coachId])

  useEffect(() => { fetch() }, [fetch])

  return { clients, loading, error, refetch: fetch }
}
