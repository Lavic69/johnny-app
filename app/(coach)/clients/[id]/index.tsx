import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Client, Profile } from '@/types'

type Tab = 'training' | 'nutrition' | 'checkins'

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('training')
  const [client, setClient] = useState<(Client & { profile: Profile }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('clients')
      .select('*, profile:profiles(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setClient(data as (Client & { profile: Profile }))
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>
  }

  if (!client) {
    return <View style={styles.center}><Text style={styles.errorText}>Client introuvable</Text></View>
  }

  const onboarding = client.onboarding

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{client.profile.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.name}>{client.profile.full_name}</Text>
            <Text style={styles.meta}>
              {onboarding
                ? `${onboarding.goal?.replace('_', ' ')} · ${onboarding.level}`
                : 'Onboarding non complété'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['training', 'nutrition', 'checkins'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'training' ? 'Entraînement' : tab === 'nutrition' ? 'Nutrition' : 'Check-ins'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'training' && <PlaceholderTab label="Programmes — Phase 3" />}
        {activeTab === 'nutrition' && <PlaceholderTab label="Nutrition — Phase 5" />}
        {activeTab === 'checkins' && <PlaceholderTab label="Check-ins — Phase 6" />}
      </ScrollView>
    </View>
  )
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabContentText}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  errorText: { color: '#94a3b8' },
  header: { padding: 20, paddingTop: 60 },
  back: { color: '#e11d48', fontSize: 16, marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e11d48', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
  name: { color: '#f8fafc', fontWeight: 'bold', fontSize: 20 },
  meta: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#e11d48' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#e11d48' },
  content: { flex: 1 },
  tabContent: { padding: 40, alignItems: 'center' },
  tabContentText: { color: '#64748b', textAlign: 'center' },
})
