import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useClientId } from '@/hooks/useClientId'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import type { ProgramDay } from '@/lib/openai'

export default function ClientHome() {
  const router = useRouter()
  const { profile } = useAuth()
  const { clientId, loading: clientLoading } = useClientId(profile?.id ?? null)
  const { program, loading: programLoading } = useActiveProgram(clientId)

  if (clientLoading || programLoading) {
    return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>
  }

  if (!program) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Aucun programme actif</Text>
        <Text style={styles.emptyText}>Ton coach prépare ton programme. Il arrivera bientôt !</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon programme</Text>
        <Text style={styles.subtitle}>
          {program.exercises.length} jours · approuvé le{' '}
          {program.approved_at
            ? new Date(program.approved_at).toLocaleDateString('fr-FR')
            : '—'}
        </Text>
      </View>

      <View style={styles.days}>
        {program.exercises.map((day) => (
          <DayCard
            key={day.order}
            day={day}
            onPress={() =>
              router.push({
                pathname: '/(client)/session/[dayOrder]',
                params: {
                  dayOrder: String(day.order),
                  programId: program.id,
                  clientId: clientId!,
                  dayJson: JSON.stringify(day),
                },
              })
            }
          />
        ))}
      </View>
    </ScrollView>
  )
}

function DayCard({ day, onPress }: { day: ProgramDay; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardLeft}>
        <Text style={styles.dayLabel}>{day.day}</Text>
        <Text style={styles.exerciseCount}>{day.items.length} exercices</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b', padding: 40 },
  emptyTitle: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  days: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 16, padding: 18, marginBottom: 12 },
  cardLeft: { flex: 1 },
  dayLabel: { color: '#f8fafc', fontWeight: '600', fontSize: 16 },
  exerciseCount: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  chevron: { color: '#64748b', fontSize: 22 },
})
