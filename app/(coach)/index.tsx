import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'
import { useClients } from '@/hooks/useClients'

interface DashboardStats {
  totalClients: number
  onboardedClients: number
  checkinsThisWeek: number
  sessionsThisWeek: number
}

export default function CoachDashboard() {
  const router = useRouter()
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)
  const { clients, loading: clientsLoading, refetch } = useClients(coach?.id ?? null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Bonjour' : today.getHours() < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  const fetchStats = useCallback(async () => {
    if (!coach?.id || clients.length === 0) return
    const clientIds = clients.map((c) => c.id)

    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const weekStart = monday.toISOString().split('T')[0]

    const [checkinsRes, sessionsRes] = await Promise.all([
      supabase
        .from('weekly_checkins')
        .select('id', { count: 'exact' })
        .in('client_id', clientIds)
        .gte('week_start', weekStart),
      supabase
        .from('session_logs')
        .select('id', { count: 'exact' })
        .in('client_id', clientIds)
        .gte('logged_at', monday.toISOString()),
    ])

    setStats({
      totalClients: clients.length,
      onboardedClients: clients.filter((c) => c.onboarding).length,
      checkinsThisWeek: checkinsRes.count ?? 0,
      sessionsThisWeek: sessionsRes.count ?? 0,
    })
  }, [coach?.id, clients])

  useEffect(() => { fetchStats() }, [fetchStats])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }, [refetch])

  if (clientsLoading) {
    return <View style={styles.center}><ActivityIndicator color="#e11d48" size="large" /></View>
  }

  const onboardingRate = stats && stats.totalClients > 0
    ? Math.round((stats.onboardedClients / stats.totalClients) * 100)
    : 0

  const checkinRate = stats && stats.totalClients > 0
    ? Math.round((stats.checkinsThisWeek / stats.totalClients) * 100)
    : 0

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e11d48" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{firstName} 👋</Text>
        </View>
        <View style={styles.dateBadge}>
          <Text style={styles.dateText}>
            {today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>

      {/* Stats principales */}
      <View style={styles.statsGrid}>
        <StatCard
          icon="people"
          label="Clients"
          value={stats?.totalClients ?? clients.length}
          color="#3080ff"
        />
        <StatCard
          icon="checkmark-circle"
          label="Check-ins (sem.)"
          value={stats?.checkinsThisWeek ?? 0}
          color="#00bb7f"
        />
        <StatCard
          icon="barbell"
          label="Séances (sem.)"
          value={stats?.sessionsThisWeek ?? 0}
          color="#ff8b1a"
        />
        <StatCard
          icon="person-done"
          label="Onboardés"
          value={stats?.onboardedClients ?? 0}
          color="#e11d48"
        />
      </View>

      {/* Taux de complétion */}
      {stats && stats.totalClients > 0 && (
        <View style={styles.ratesSection}>
          <Text style={styles.sectionTitle}>Cette semaine</Text>
          <View style={styles.rateCard}>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Taux de check-in</Text>
              <Text style={styles.rateValue}>{checkinRate}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${checkinRate}%`, backgroundColor: '#00bb7f' }]} />
            </View>
          </View>
          <View style={styles.rateCard}>
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Profils complétés</Text>
              <Text style={styles.rateValue}>{onboardingRate}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${onboardingRate}%`, backgroundColor: '#3080ff' }]} />
            </View>
          </View>
        </View>
      )}

      {/* Clients récents */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Clients récents</Text>
          <TouchableOpacity onPress={() => router.push('/(coach)/clients')}>
            <Text style={styles.seeAll}>Voir tous</Text>
          </TouchableOpacity>
        </View>

        {clients.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => router.push('/(coach)/clients/new')}
          >
            <Ionicons name="person-add-outline" size={28} color="#334155" />
            <Text style={styles.emptyCardText}>Ajouter votre premier client</Text>
          </TouchableOpacity>
        ) : (
          clients.slice(0, 4).map((client) => {
            const name = client.profile?.full_name ?? 'Client'
            const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            const hasOnboarding = !!client.onboarding
            return (
              <TouchableOpacity
                key={client.id}
                style={styles.clientRow}
                onPress={() => router.push(`/(coach)/clients/${client.id}`)}
                activeOpacity={0.75}
              >
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>{initials}</Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{name}</Text>
                  <Text style={styles.clientStatus}>
                    {hasOnboarding ? 'Profil complété' : "En attente d'onboarding"}
                  </Text>
                </View>
                <View style={[styles.statusDot, hasOnboarding ? styles.dotGreen : styles.dotOrange]} />
              </TouchableOpacity>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: number; color: string
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingTop: 64, paddingBottom: 24,
  },
  greeting: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  name: { color: '#f8fafc', fontSize: 26, fontWeight: 'bold', marginTop: 2 },
  dateBadge: { backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#334155' },
  dateText: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10, marginBottom: 24,
  },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#1e293b', borderRadius: 16,
    padding: 16, alignItems: 'flex-start', gap: 8,
    borderTopWidth: 3, borderWidth: 1, borderColor: '#334155',
  },
  statValue: { color: '#f8fafc', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#64748b', fontSize: 12 },

  ratesSection: { paddingHorizontal: 16, marginBottom: 24, gap: 10 },
  rateCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', gap: 10 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateLabel: { color: '#94a3b8', fontSize: 13 },
  rateValue: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15 },
  progressBar: { height: 6, backgroundColor: '#334155', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  recentSection: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 17 },
  seeAll: { color: '#e11d48', fontSize: 13, fontWeight: '600' },

  emptyCard: {
    backgroundColor: '#1e293b', borderRadius: 16,
    padding: 28, alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed',
  },
  emptyCardText: { color: '#475569', fontSize: 14 },

  clientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 16,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#334155',
  },
  clientAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#e11d48',
    justifyContent: 'center', alignItems: 'center',
  },
  clientAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  clientInfo: { flex: 1 },
  clientName: { color: '#f8fafc', fontWeight: '600', fontSize: 15 },
  clientStatus: { color: '#64748b', fontSize: 12, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: '#00bb7f' },
  dotOrange: { backgroundColor: '#ff8b1a' },
})
