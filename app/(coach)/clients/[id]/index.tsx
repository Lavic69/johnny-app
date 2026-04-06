import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native'
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

  async function handleDeleteClient() {
    if (!client) return
    Alert.alert(
      'Supprimer ce client',
      `Es-tu sûr de vouloir supprimer ${client.profile.full_name} ? Son compte, son programme et toutes ses données seront définitivement supprimés.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Dernière confirmation',
              'Cette action est irréversible.',
              [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Oui, supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    const { error } = await supabase.functions.invoke('delete-client', {
                      body: { clientId: client.id },
                    })
                    if (error) {
                      Alert.alert('Erreur', "La suppression a échoué. Réessaie ou contacte le support.")
                      return
                    }
                    router.back()
                  },
                },
              ]
            ),
        },
      ]
    )
  }

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
        <View style={styles.headerActions}>
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
          <TouchableOpacity style={styles.deleteClientBtn} onPress={handleDeleteClient}>
            <Text style={styles.deleteClientText}>Supprimer ce client</Text>
          </TouchableOpacity>
        </View>
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
        {activeTab === 'nutrition' && <NutritionTab clientId={id} />}
        {activeTab === 'checkins' && <CheckinsTab clientId={id} />}
      </ScrollView>
    </View>
  )
}

function TrainingTab({ clientId }: { clientId: string }) {
  const { programs, loading: programsLoading } = useClientPrograms(clientId)
  const [sessionLogs, setSessionLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('session_logs')
      .select('*, session:sessions(day_label, order_index)')
      .eq('client_id', clientId)
      .order('logged_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setSessionLogs(data ?? [])
        setLogsLoading(false)
      })
  }, [clientId])

  if (programsLoading || logsLoading) return <ActivityIndicator color="#e11d48" style={{ marginTop: 40 }} />

  return (
    <View style={{ padding: 16 }}>
      {/* Programme actif */}
      {programs.length === 0 ? (
        <View style={styles.tabContent}>
          <Text style={styles.tabContentText}>Aucun programme pour ce client.</Text>
        </View>
      ) : (
        <>
          <Text style={sectionLabel.label}>Programme</Text>
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
        </>
      )}

      {/* Séances effectuées */}
      <Text style={[sectionLabel.label, { marginTop: 20 }]}>Séances effectuées</Text>
      {sessionLogs.length === 0 ? (
        <Text style={styles.tabContentText}>Aucune séance enregistrée.</Text>
      ) : (
        sessionLogs.map((log) => (
          <View key={log.id} style={sessionStyles.card}>
            <View style={sessionStyles.header}>
              <Text style={sessionStyles.dayLabel}>{log.session?.day_label ?? 'Séance'}</Text>
              <Text style={sessionStyles.date}>
                {new Date(log.logged_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
            {(log.sets as any[]).map((set: any, i: number) => (
              <View key={i} style={sessionStyles.setRow}>
                <Text style={sessionStyles.exercise}>{set.exercise}</Text>
                <Text style={sessionStyles.setValues}>
                  {set.weight > 0 ? `${set.weight}kg` : '—'} · {set.reps > 0 ? `${set.reps} reps` : '—'}{set.rpe > 0 ? ` · RPE ${set.rpe}` : ''}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  )
}

function NutritionTab({ clientId }: { clientId: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const since = new Date()
    since.setDate(since.getDate() - 7)
    supabase
      .from('food_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('logged_date', since.toISOString().split('T')[0])
      .order('logged_date', { ascending: false })
      .then(({ data }) => {
        setLogs(data ?? [])
        setLoading(false)
      })
  }, [clientId])

  if (loading) return <ActivityIndicator color="#e11d48" style={{ marginTop: 40 }} />

  if (logs.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabContentText}>Aucune entrée nutritionnelle cette semaine.</Text>
      </View>
    )
  }

  // Grouper par date
  const byDate: Record<string, any[]> = {}
  for (const log of logs) {
    if (!byDate[log.logged_date]) byDate[log.logged_date] = []
    byDate[log.logged_date].push(log)
  }

  const MEAL_LABELS: Record<string, string> = {
    breakfast: 'Petit-déjeuner',
    lunch: 'Déjeuner',
    dinner: 'Dîner',
    snack: 'Collation',
  }

  return (
    <View style={{ padding: 16 }}>
      {Object.entries(byDate).map(([date, dayLogs]) => {
        const allFoods = dayLogs.flatMap((l) => l.foods)
        const totals = allFoods.reduce(
          (acc: any, f: any) => {
            const ratio = f.source === 'ai' ? 1 : f.quantity_g / 100
            return {
              calories: acc.calories + f.calories * ratio,
              protein: acc.protein + f.protein_g * ratio,
            }
          },
          { calories: 0, protein: 0 }
        )
        return (
          <View key={date} style={nutritionStyles.dayCard}>
            <View style={nutritionStyles.dayHeader}>
              <Text style={nutritionStyles.dayDate}>
                {new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text style={nutritionStyles.dayTotals}>
                {Math.round(totals.calories)} kcal · {Math.round(totals.protein)}g prot
              </Text>
            </View>
            {dayLogs.map((log: any) => (
              <View key={log.id} style={nutritionStyles.mealSection}>
                <Text style={nutritionStyles.mealLabel}>{MEAL_LABELS[log.meal_type] ?? log.meal_type}</Text>
                {(log.foods as any[]).map((food: any, i: number) => (
                  <View key={i} style={nutritionStyles.foodRow}>
                    <Text style={nutritionStyles.foodName}>{food.name}</Text>
                    <Text style={nutritionStyles.foodCal}>
                      {food.source === 'ai'
                        ? `${food.calories} kcal`
                        : `${food.quantity_g}g · ${Math.round(food.calories * food.quantity_g / 100)} kcal`
                      }
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )
      })}
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

const sectionLabel = StyleSheet.create({
  label: { color: '#475569', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
})

const sessionStyles = StyleSheet.create({
  card: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayLabel: { color: '#f8fafc', fontWeight: '700', fontSize: 14, flex: 1 },
  date: { color: '#64748b', fontSize: 12 },
  setRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderTopWidth: 1, borderTopColor: '#1e293b' },
  exercise: { color: '#94a3b8', fontSize: 13, flex: 1 },
  setValues: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
})

const nutritionStyles = StyleSheet.create({
  dayCard: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 12 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  dayDate: { color: '#f8fafc', fontWeight: '700', fontSize: 14, textTransform: 'capitalize', flex: 1 },
  dayTotals: { color: '#00bb7f', fontWeight: '700', fontSize: 13 },
  mealSection: { marginBottom: 8 },
  mealLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  foodName: { color: '#94a3b8', fontSize: 13, flex: 1 },
  foodCal: { color: '#f8fafc', fontSize: 13 },
})

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
  headerActions: { marginTop: 16, gap: 8 },
  generateBtn: { backgroundColor: '#3080ff', borderRadius: 12, padding: 12, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  deleteClientBtn: { alignItems: 'center', padding: 10 },
  deleteClientText: { color: '#475569', fontSize: 13, fontWeight: '500' },
})
