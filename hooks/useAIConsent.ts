import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ConsentState = 'loading' | 'pending' | 'accepted' | 'declined'

interface UseAIConsentResult {
  consentState: ConsentState
  accept: () => Promise<void>
  decline: () => Promise<void>
  revoke: () => Promise<void>
}

export function useAIConsent(userId: string | null | undefined): UseAIConsentResult {
  const [consentState, setConsentState] = useState<ConsentState>('loading')

  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('ai_consent')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.ai_consent === true) setConsentState('accepted')
        else if (data?.ai_consent === false) setConsentState('declined')
        else setConsentState('pending')
      })
  }, [userId])

  async function accept() {
    if (!userId) return
    await supabase
      .from('profiles')
      .update({ ai_consent: true, ai_consent_at: new Date().toISOString() })
      .eq('id', userId)
    setConsentState('accepted')
  }

  async function decline() {
    if (!userId) return
    await supabase
      .from('profiles')
      .update({ ai_consent: false, ai_consent_at: new Date().toISOString() })
      .eq('id', userId)
    setConsentState('declined')
  }

  async function revoke() {
    if (!userId) return
    await supabase
      .from('profiles')
      .update({ ai_consent: false, ai_consent_at: new Date().toISOString() })
      .eq('id', userId)
    setConsentState('declined')
  }

  return { consentState, accept, decline, revoke }
}
