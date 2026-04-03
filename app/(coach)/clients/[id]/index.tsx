import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useClientPrograms } from '@/hooks/usePrograms'
import { useCheckins } from '@/hooks/useCheckins'
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
        {onboarding && (
          <TouchableOpacity
            style={styles.generateBtn}
            onPress={() => router.push({
              pathname: '/(coach)/programs/generate',
              params: {
                clientId: client.id,
                onboardingJson: JSON.stringify(onboarding),
              },
            })}
          >
            <Text style={styles.generateBtnText}>✨ Générer un programme</Text>
          </TouchableOpacity>
        )}
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
        {activeTab === 'training' && <TrainingTab clientId={id} />}
        {activeTab === 'nutrition' && <PlaceholderTab label="Nutrition — Phase 5" />}
        {activeTab === 'checkins' && <CheckinsTab clientId={id} />}
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

function TrainingTab({ clientId }: { clientId: string }) {
  const { programs, loading } = useClientPrograms(clientId)

  if (loading) return <ActivityIndicator color="#e11d48" style={{ marginTop: 40 }} />

  if (programs.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabContentText}>Aucun programme pour ce client.</Text>
      </View>
    )
  }

  return (
    <View style={{ padding: 16 }}>
      {programs.map((program) => (
        <View key={program.id} style={programStyles.card}>
          <View style={programStyles.cardHeader}>
            <Text style={programStyles.date}>
              {new Date(program.created_at).toLocaleDateString('fr-FR')}
            </Text>
            <View style={[programStyles.badge, program.status === 'approved' ? programStyles.approved : programStyles.draft]}>
              <Text style={programStyles.badgeText}>
                {program.status === 'approved' ? '✓ Approuvé' : 'Brouillon'}
              </Text>
            </View>
          </View>
          <Text style={programStyles.days}>
            {Array.isArray(program.exercises) ? `${program.exercises.length} jours d'entraînement` : ''}
          </Text>
        </View>
      ))}
    </View>
  )
}

function CheckinsTab({ clientId }: { clientId: string }) {
  const { checkins, loading } = useCheckins(clientId)

  if (loading) return <ActivityIndicator color="#e11d48" style={{ marginTop: 40 }} />

  if (checkins.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabContentText}>Aucun check-in pour ce client.</Text>
      </View>
    )
  }

  return (
    <View style={{ padding: 16 }}>
      {checkins.map((c) => (
        <View key={c.id} style={checkinStyles.card}>
          <Text style={checkinStyles.week}>
            Semaine du {new Date(c.week_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </Text>
          <View style={checkinStyles.scores}>
            <ScoreBadge label="Énergie" value={c.energy} />
            <ScoreBadge label="Récup" value={c.recovery} />
            <ScoreBadge label="Moral" value={c.mood} />
          </View>
        </View>
      ))}
    </View>
  )
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 4 ? '#00bb7f' : value >= 3 ? '#ff8b1a' : '#e11d48'
  return (
    <View style={checkinStyles.badge}>
      <Text style={[checkinStyles.badgeValue, { color }]}>{value}/5</Text>
      <Text style={checkinStyles.badgeLabel}>{label}</Text>
    </View>
  )
}

const checkinStyles = StyleSheet.create({
  card: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 10 },
  week: { color: '#94a3b8', fontSize: 13, marginBottom: 10, textTransform: 'capitalize' },
  scores: { flexDirection: 'row', gap: 8 },
  badge: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 10, alignItems: 'center' },
  badgeValue: { fontSize: 18, fontWeight: 'bold' },
  badgeLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
})

const programStyles = StyleSheet.create({
  card: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  date: { color: '#94a3b8', fontSize: 13 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  approved: { backgroundColor: '#00bb7f22' },
  draft: { backgroundColor: '#3080ff22' },
  badgeText: { color: '#f8fafc', fontSize: 12, fontWeight: '600' },
  days: { color: '#f8fafc', fontSize: 14 },
})

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
  generateBtn: { backgroundColor: '#3080ff', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 16 },
  generateBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
