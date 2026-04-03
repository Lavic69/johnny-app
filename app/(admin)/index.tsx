import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert
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
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchCoaches = useCallback(async () => {
    const { data, error } = await supabase
      .from('coaches')
      .select('id, status, created_at, profile:profiles(id, full_name)')
      .order('created_at', { ascending: false })

    if (!error) setCoaches((data as CoachEntry[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCoaches() }, [fetchCoaches])

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
            const { error } = await supabase
              .from('coaches')
              .update({ status: newStatus })
              .eq('id', coach.id)

            if (error) {
              Alert.alert('Erreur', error.message)
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
    return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin</Text>
        <Text style={styles.subtitle}>
          {active.length} actif{active.length > 1 ? 's' : ''} · {pending.length} en attente
        </Text>
      </View>

      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ En attente d'activation</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Comptes actifs</Text>
        {active.length === 0 ? (
          <Text style={styles.empty}>Aucun coach actif.</Text>
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
    </View>
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

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {coach.profile.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.coachName}>{coach.profile.full_name}</Text>
          <Text style={styles.coachDate}>
            Inscrit le {new Date(coach.created_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.toggleBtn, isActive ? styles.toggleActive : styles.togglePending]}
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
  container: { flex: 1, backgroundColor: '#1e293b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { color: '#64748b', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  empty: { color: '#475569', fontSize: 14, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 16, padding: 14, marginBottom: 10 },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e11d48', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  coachName: { color: '#f8fafc', fontWeight: '600', fontSize: 15 },
  coachDate: { color: '#64748b', fontSize: 12, marginTop: 2 },
  toggleBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  toggleActive: { backgroundColor: '#e11d4830' },
  togglePending: { backgroundColor: '#00bb7f' },
  toggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
})
