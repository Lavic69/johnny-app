import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Program } from '@/types'

export function useClientPrograms(clientId: string | null) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }

    supabase
      .from('programs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPrograms((data as Program[]) ?? [])
        setLoading(false)
      })
  }, [clientId])

  return { programs, loading }
}
