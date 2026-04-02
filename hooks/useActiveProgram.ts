import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Program } from '@/types'
import type { ProgramDay } from '@/lib/openai'

export interface ActiveProgram extends Omit<Program, 'exercises'> {
  exercises: ProgramDay[]
}

export function useActiveProgram(clientId: string | null) {
  const [program, setProgram] = useState<ActiveProgram | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }

    supabase
      .from('programs')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setProgram(data as ActiveProgram ?? null)
        setLoading(false)
      })
  }, [clientId])

  return { program, loading }
}
