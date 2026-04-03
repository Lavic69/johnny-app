import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { WeeklyCheckin } from '@/types'

export function useCheckins(clientId: string | null) {
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }

    supabase
      .from('weekly_checkins')
      .select('*')
      .eq('client_id', clientId)
      .order('week_start', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setCheckins((data as WeeklyCheckin[]) ?? [])
        setLoading(false)
      })
  }, [clientId])

  return { checkins, loading }
}
