import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/hooks/useAuth'
import { useClientId } from '@/hooks/useClientId'
import { useActiveProgram } from '@/hooks/useActiveProgram'
import { supabase } from '@/lib/supabase'
import type { ProgramDay } from '@/lib/openai'

export default function ClientHome() {
  const router = useRouter()
  const { profile } = useAuth()
  const { clientId, onboarding, loading: clientLoading, refetch } = useClientId(profile?.id ?? null)
  const { program, loading: programLoading } = useActiveProgram(clientId)
  const [loggedDays, setLoggedDays] = useState<Set<number>>(new Set())

  const fetchLoggedDays = useCallback(async () => {
    if (!clientId || !program) return
    const { data } = await supabase
      .from('sessions')
      .select('order_index, session_logs(id)')
      .eq('program_id', program.id)
    if (!data) return
    const logged = new Set<number>()
    for (const s of data) {
      if ((s.session_logs as any[]).length > 0) logged.add(s.order_index)
    }
    setLoggedDays(logged)
  }, [clientId, program?.id])

  useFocusEffect(useCallback(() => {
    refetch()
    fetchLoggedDays()
  }, [refetch, fetchLoggedDays]))

  if (clientLoading || programLoading) {
    return <View style={styles.center}><ActivityIndicator color="#e11d48" size="large" /></View>
  }

  // Onboarding non complété → écran de bienvenue
  if (!onboarding) {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeTop}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="fitness" size={40} color="#e11d48" />
          </View>
          <Text style={styles.welcomeTitle}>Bienvenue{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} ! 👋</Text>
          <Text style={styles.welcomeSub}>
            Avant de commencer, ton coach a besoin de quelques infos pour préparer ton programme personnalisé.
          </Text>
        </View>

        <View style={styles.welcomeSteps}>
          {[
            { icon: 'trophy-outline', text: 'Ton objectif principal' },
            { icon: 'bar-chart-outline', text: 'Ton niveau de forme actuel' },
            { icon: 'barbell-outline', text: 'Le matériel dont tu disposes' },
          ].map((item, i) => (
            <View key={i} style={styles.welcomeStepRow}>
              <View style={styles.welcomeStepIcon}>
                <Ionicons name={item.icon as any} size={18} color="#e11d48" />
              </View>
              <Text style={styles.welcomeStepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.welcomeDuration}>⏱ 1 minute à remplir</Text>

        <TouchableOpacity
          style={styles.welcomeBtn}
          onPress={() => router.push('/(client)/onboarding')}
          activeOpacity={0.85}
        >
          <Text style={styles.welcomeBtnText}>Compléter mon profil</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    )
  }

  // Onboarding fait mais pas encore de programme
  if (!program) {
    return (
      <View style={styles.center}>
        <Ionicons name="time-outline" size={52} color="#334155" />
        <Text style={styles.emptyTitle}>Programme en préparation</Text>
        <Text style={styles.emptyText}>
          Ton coach a bien reçu ton profil et prépare ton programme. Il arrivera bientôt !
        </Text>
      </View>
    )
  }

  // Programme actif
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mon programme</Text>
        <Text style={styles.subtitle}>
          {program.exercises.length} jour{program.exercises.length > 1 ? 's' : ''} · approuvé le{' '}
          {program.approved_at ? new Date(program.approved_at).toLocaleDateString('fr-FR') : '—'}
        </Text>
      </View>

      <View style={styles.days}>
        {program.exercises.map((day) => (
          <DayCard
            key={day.order}
            day={day}
            logged={loggedDays.has(day.order)}
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

function DayCard({ day, logged, onPress }: { day: ProgramDay; logged: boolean; onPress: () => void }) {
  const items = day.items ?? []
  return (
    <TouchableOpacity
      style={[styles.card, logged && styles.cardLogged]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.cardIndicator, logged && styles.cardIndicatorLogged]} />
      <View style={styles.cardLeft}>
        <Text style={[styles.dayLabel, logged && styles.dayLabelLogged]}>{day.day}</Text>
        <Text style={styles.exerciseCount}>{items.length} exercice{items.length > 1 ? 's' : ''}</Text>
      </View>
      {logged ? (
        <View style={styles.loggedBadge}>
          <Ionicons name="create-outline" size={15} color="#ff8b1a" />
          <Text style={styles.loggedBadgeText}>Modifier</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#475569" />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 40, gap: 16 },
  emptyTitle: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Welcome screen
  welcomeContainer: { flex: 1, backgroundColor: '#0f172a', padding: 24, paddingTop: 80, justifyContent: 'center' },
  welcomeTop: { alignItems: 'center', marginBottom: 36 },
  welcomeIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#e11d4815', borderWidth: 1.5, borderColor: '#e11d4840',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  welcomeTitle: { color: '#f8fafc', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  welcomeSub: { color: '#64748b', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  welcomeSteps: { backgroundColor: '#1e293b', borderRadius: 18, padding: 20, gap: 14, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  welcomeStepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  welcomeStepIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#e11d4815',
    justifyContent: 'center', alignItems: 'center',
  },
  welcomeStepText: { color: '#94a3b8', fontSize: 15, fontWeight: '500' },
  welcomeDuration: { color: '#475569', fontSize: 13, textAlign: 'center', marginBottom: 28 },
  welcomeBtn: {
    backgroundColor: '#e11d48', borderRadius: 16,
    padding: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  welcomeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },

  // Programme
  header: { padding: 20, paddingTop: 64 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  days: { padding: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 16,
    padding: 18, marginBottom: 10,
    borderWidth: 1, borderColor: '#334155',
    overflow: 'hidden',
  },
  cardLogged: {
    backgroundColor: '#00bb7f12',
    borderColor: '#00bb7f40',
  },
  cardIndicator: {
    width: 3, height: '100%', borderRadius: 2,
    backgroundColor: '#334155', marginRight: 14,
    position: 'absolute', left: 0, top: 0, bottom: 0,
  },
  cardIndicatorLogged: { backgroundColor: '#00bb7f' },
  cardLeft: { flex: 1, marginLeft: 8 },
  dayLabel: { color: '#f8fafc', fontWeight: '600', fontSize: 16 },
  dayLabelLogged: { color: '#00bb7f' },
  exerciseCount: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  loggedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ff8b1a20', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  loggedBadgeText: { color: '#ff8b1a', fontSize: 12, fontWeight: '700' },
})
