import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function ClientAccountScreen() {
  const { profile } = useAuth()

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
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Client</Text>
        </View>
      </View>

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

  profileSection: { alignItems: 'center', marginBottom: 40 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#3080ff',
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
  },
  roleBadgeText: { color: '#3080ff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: '#475569', fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8, paddingHorizontal: 4,
  },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#e11d4830',
  },
  actionTextDanger: { color: '#e11d48', fontSize: 15, fontWeight: '600' },
})
