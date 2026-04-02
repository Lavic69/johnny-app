import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Coach } from '@/types'

interface CoachState {
  coach: Coach | null
  loading: boolean
  error: string | null
}

export function useCoach(profileId: string | null): CoachState {
  const [coach, setCoach] = useState<Coach | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }

    supabase
      .from('coaches')
      .select('*')
      .eq('profile_id', profileId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCoach(data)
        setLoading(false)
      })
  }, [profileId])

  return { coach, loading, error }
}
