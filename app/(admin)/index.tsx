import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView, RefreshControl
} from 'react-native'
import { supabase } from '@/lib/supabase'

interface CoachEntry {
  id: string
  status: 'active' | 'pending'
  profile: {
    full_name: string
    id: string
  }
  created_at: string
}

export default function AdminScreen() {
  const [coaches, setCoaches] = useState<CoachEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCoaches = useCallback(async () => {
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('coaches')
      .select('id, status, created_at, profile:profiles(id, full_name)')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setCoaches((data as CoachEntry[]) ?? [])
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchCoaches() }, [fetchCoaches])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchCoaches()
  }, [fetchCoaches])

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
        },
      },
    ])
  }

  async function toggleStatus(coach: CoachEntry) {
    const newStatus = coach.status === 'active' ? 'pending' : 'active'
    const label = newStatus === 'active' ? 'activer' : 'désactiver'

    Alert.alert(
      'Confirmer',
      `Voulez-vous ${label} le compte de ${coach.profile.full_name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setUpdating(coach.id)
            const { error: updateError } = await supabase
              .from('coaches')
              .update({ status: newStatus })
              .eq('id', coach.id)

            if (updateError) {
              Alert.alert('Erreur', updateError.message)
            } else {
              setCoaches((prev) =>
                prev.map((c) => c.id === coach.id ? { ...c, status: newStatus } : c)
              )
            }
            setUpdating(null)
          },
        },
      ]
    )
  }

  const active = coaches.filter((c) => c.status === 'active')
  const pending = coaches.filter((c) => c.status === 'pending')

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e11d48" size="large" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#e11d48"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Panneau</Text>
          <Text style={styles.title}>Admin</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{coaches.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#00bb7f' }]}>{active.length}</Text>
          <Text style={styles.statLabel}>Actifs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#ff8b1a' }]}>{pending.length}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Erreur : {error}</Text>
          <TouchableOpacity onPress={fetchCoaches}>
            <Text style={styles.errorRetry}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pending section */}
      {pending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending.length}</Text>
            </View>
            <Text style={styles.sectionTitle}>En attente d'activation</Text>
          </View>
          {pending.map((coach) => (
            <CoachRow
              key={coach.id}
              coach={coach}
              updating={updating === coach.id}
              onToggle={() => toggleStatus(coach)}
            />
          ))}
        </View>
      )}

      {/* Active section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.badge, styles.badgeGreen]}>
            <Text style={styles.badgeText}>{active.length}</Text>
          </View>
          <Text style={styles.sectionTitle}>Comptes actifs</Text>
        </View>
        {active.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun coach actif pour l'instant.</Text>
          </View>
        ) : (
          active.map((coach) => (
            <CoachRow
              key={coach.id}
              coach={coach}
              updating={updating === coach.id}
              onToggle={() => toggleStatus(coach)}
            />
          ))
        )}
      </View>

      {coaches.length === 0 && !error && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Aucun coach inscrit.</Text>
        </View>
      )}
    </ScrollView>
  )
}

function CoachRow({
  coach,
  updating,
  onToggle,
}: {
  coach: CoachEntry
  updating: boolean
  onToggle: () => void
}) {
  const isActive = coach.status === 'active'
  const initials = coach.profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.coachName}>{coach.profile.full_name}</Text>
        <View style={styles.rowMeta}>
          <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotPending]} />
          <Text style={styles.coachDate}>
            {isActive ? 'Actif · ' : 'En attente · '}
            Inscrit le {new Date(coach.created_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.toggleBtn, isActive ? styles.toggleDeactivate : styles.toggleActivate]}
        onPress={onToggle}
        disabled={updating}
      >
        {updating
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.toggleText}>{isActive ? 'Désactiver' : 'Activer'}</Text>
        }
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 20,
  },
  eyebrow: { color: '#e11d48', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc' },
  logoutBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoutText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },

  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: '#334155', marginVertical: 4 },

  errorBox: {
    backgroundColor: '#e11d4820',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e11d4850',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: { color: '#e11d48', fontSize: 13, flex: 1 },
  errorRetry: { color: '#e11d48', fontWeight: '700', fontSize: 13, marginLeft: 12 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#ff8b1a30',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeGreen: { backgroundColor: '#00bb7f30' },
  badgeText: { color: '#f8fafc', fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyState: {
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { color: '#475569', fontSize: 14, fontStyle: 'italic' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e11d48',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  rowInfo: { flex: 1 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: '#00bb7f' },
  dotPending: { backgroundColor: '#ff8b1a' },
  coachName: { color: '#f8fafc', fontWeight: '600', fontSize: 15 },
  coachDate: { color: '#64748b', fontSize: 12 },
  toggleBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 88,
    alignItems: 'center',
    flexShrink: 0,
  },
  toggleActivate: { backgroundColor: '#00bb7f' },
  toggleDeactivate: { backgroundColor: '#e11d4820', borderWidth: 1, borderColor: '#e11d4850' },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
})
