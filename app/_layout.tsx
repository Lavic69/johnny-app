import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { registerPushToken } from '@/lib/notifications'

export default function RootLayout() {
  const { session, role, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && role === 'coach' && segments[0] !== '(coach)') {
      router.replace('/(coach)')
    } else if (session && role === 'client' && segments[0] !== '(client)') {
      router.replace('/(client)')
    } else if (session && role === 'admin' && segments[0] !== '(admin)') {
      router.replace('/(admin)')
    }
  }, [session, role, loading, segments])

  useEffect(() => {
    if (session?.user?.id) {
      registerPushToken(session.user.id)
    }
  }, [session?.user?.id])

  if (loading) return null

  return <Slot />
}
