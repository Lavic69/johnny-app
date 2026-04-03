import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'
import { useClients } from '@/hooks/useClients'
import type { ClientWithProfile } from '@/hooks/useClients'

export default function CoachDashboard() {
  const router = useRouter()
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)
  const { clients, loading } = useClients(coach?.id ?? null)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e11d48" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes clients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(coach)/clients/new')}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {clients.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun client pour l'instant.</Text>
          <Text style={styles.emptySubtext}>Ajoutez votre premier client pour commencer.</Text>
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

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>
          {client.profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{client.profile?.full_name ?? 'Client'}</Text>
        <Text style={styles.cardStatus}>
          {hasOnboarding ? '✓ Profil complété' : "⏳ En attente d'onboarding"}
        </Text>
      </View>
      <Text style={styles.cardChevron}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc' },
  addButton: { backgroundColor: '#e11d48', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#f8fafc', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  emptySubtext: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e11d48', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cardInfo: { flex: 1 },
  cardName: { color: '#f8fafc', fontWeight: '600', fontSize: 16 },
  cardStatus: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  cardChevron: { color: '#64748b', fontSize: 22 },
})
