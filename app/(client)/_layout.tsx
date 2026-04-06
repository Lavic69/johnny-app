import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

type CoachStatus = 'loading' | 'active' | 'blocked'

export default function ClientLayout() {
  const { profile } = useAuth()
  const [coachStatus, setCoachStatus] = useState<CoachStatus>('loading')
  const [coachId, setCoachId] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.id) return

    supabase
      .from('clients')
      .select('coach:coaches(id, status)')
      .eq('profile_id', profile.id)
      .single()
      .then(({ data }) => {
        const coach = data?.coach as { id: string; status: string } | null
        if (!coach) { setCoachStatus('blocked'); return }
        setCoachId(coach.id) // toujours stocker l'id pour le Realtime
        setCoachStatus(coach.status === 'active' ? 'active' : 'blocked')
      })
  }, [profile?.id])

  // Realtime — éjecte le client immédiatement si son coach est désactivé en cours de session
  useEffect(() => {
    if (!coachId) return

    const channel = supabase
      .channel(`coach-status-${coachId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'coaches', filter: `id=eq.${coachId}` },
        (payload) => {
          const newStatus = (payload.new as any).status
          setCoachStatus(newStatus === 'active' ? 'active' : 'blocked')
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [coachId])

  if (coachStatus === 'loading') {
    return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>
  }

  if (coachStatus === 'blocked') {
    return (
      <View style={styles.blocked}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={40} color="#e11d48" />
        </View>
        <Text style={styles.title}>Accès suspendu</Text>
        <Text style={styles.subtitle}>
          Le compte de ton coach n'est plus actif.{'\n'}
          Contacte-le pour plus d'informations.
        </Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#e11d48',
        tabBarInactiveTintColor: '#475569',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Programme',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Compte',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
      {/* Cachés de la tab bar */}
      <Tabs.Screen name="onboarding" options={{ href: null }} />
      <Tabs.Screen name="session" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  blocked: {
    flex: 1, backgroundColor: '#0f172a',
    justifyContent: 'center', alignItems: 'center',
    padding: 40, gap: 16,
  },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e11d4815', borderWidth: 1, borderColor: '#e11d4840',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#64748b', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  logoutBtn: {
    marginTop: 16, backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  logoutText: { color: '#e11d48', fontWeight: '600', fontSize: 15 },
})
