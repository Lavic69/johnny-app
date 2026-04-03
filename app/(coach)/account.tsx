import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'
import { useClients } from '@/hooks/useClients'

export default function CoachAccountScreen() {
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)
  const { clients } = useClients(coach?.id ?? null)

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + nom */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Coach</Text>
        </View>
        {coach && (
          <View style={[styles.statusBadge, coach.status === 'active' ? styles.statusActive : styles.statusPending]}>
            <View style={[styles.statusDot, coach.status === 'active' ? styles.dotActive : styles.dotPending]} />
            <Text style={styles.statusText}>
              {coach.status === 'active' ? 'Compte actif' : 'En attente d\'activation'}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{clients.length}</Text>
          <Text style={styles.statLabel}>Clients</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{clients.filter(c => c.onboarding).length}</Text>
          <Text style={styles.statLabel}>Onboardés</Text>
        </View>
      </View>

      {/* Infos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={18} color="#64748b" />
          <Text style={styles.infoText}>{profile?.id ? '—' : '—'}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#e11d48" />
          <Text style={styles.actionTextDanger}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, paddingTop: 64, paddingBottom: 40 },

  profileSection: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e11d48',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  name: { color: '#f8fafc', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  roleBadge: {
    backgroundColor: '#3080ff20',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 10,
  },
  roleBadgeText: { color: '#3080ff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  statusActive: { backgroundColor: '#00bb7f20' },
  statusPending: { backgroundColor: '#ff8b1a20' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { backgroundColor: '#00bb7f' },
  dotPending: { backgroundColor: '#ff8b1a' },
  statusText: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1, backgroundColor: '#1e293b',
    borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  statValue: { color: '#f8fafc', fontSize: 28, fontWeight: 'bold' },
  statLabel: { color: '#64748b', fontSize: 12, marginTop: 4 },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#475569', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8, paddingHorizontal: 4,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#334155',
  },
  infoText: { color: '#94a3b8', fontSize: 15 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#e11d4830',
  },
  actionTextDanger: { color: '#e11d48', fontSize: 15, fontWeight: '600' },
})
