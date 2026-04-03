import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'
import { useClients } from '@/hooks/useClients'
import type { ClientWithProfile } from '@/hooks/useClients'

export default function ClientListScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)
  const { clients, loading } = useClients(coach?.id ?? null)

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(coach)/clients/new')}
        >
          <Ionicons name="person-add" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {clients.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={56} color="#334155" />
          <Text style={styles.emptyText}>Aucun client pour l'instant</Text>
          <Text style={styles.emptySubtext}>Appuyez sur "Ajouter" pour inviter votre premier client.</Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={() => router.push(`/(coach)/clients/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  )
}

function ClientCard({ client, onPress }: { client: ClientWithProfile; onPress: () => void }) {
  const hasOnboarding = !!client.onboarding
  const name = client.profile?.full_name ?? 'Client'
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{name}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, hasOnboarding ? styles.dotGreen : styles.dotOrange]} />
          <Text style={styles.cardStatus}>
            {hasOnboarding ? 'Profil complété' : "En attente d'onboarding"}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#475569" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 64, paddingBottom: 20,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#e11d48', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { color: '#f8fafc', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { color: '#475569', fontSize: 14, textAlign: 'center', lineHeight: 20 },

  list: { padding: 16, paddingTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1e293b', borderRadius: 18,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#334155',
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#e11d48',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardInfo: { flex: 1 },
  cardName: { color: '#f8fafc', fontWeight: '600', fontSize: 16, marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: '#00bb7f' },
  dotOrange: { backgroundColor: '#ff8b1a' },
  cardStatus: { color: '#64748b', fontSize: 13 },
})
