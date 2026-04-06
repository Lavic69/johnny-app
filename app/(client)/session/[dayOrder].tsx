import { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { ProgramDay } from '@/lib/openai'
import type { SetLog } from '@/types'

export default function SessionLogScreen() {
  const { programId, clientId, dayJson } = useLocalSearchParams<{
    dayOrder: string
    programId: string
    clientId: string
    dayJson: string
  }>()
  const router = useRouter()

  // Expo Router peut passer ces params en array lors de navigations multiples
  const programIdStr = Array.isArray(programId) ? programId[0] : (programId ?? '')
  const clientIdStr = Array.isArray(clientId) ? clientId[0] : (clientId ?? '')
  const dayJsonStr = Array.isArray(dayJson) ? dayJson[0] : (dayJson ?? '{}')
  const day: ProgramDay = JSON.parse(dayJsonStr)
  const items = day.items ?? []

  const [logs, setLogs] = useState<Record<string, { weight: string; reps: string; rpe: string }>>(
    () => Object.fromEntries(items.map((e) => [e.name, { weight: '', reps: '', rpe: '' }]))
  )
  const [saving, setSaving] = useState(false)
  const [existingLogId, setExistingLogId] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(true)

  // Pré-remplir avec le log existant si le client a déjà loggé ce jour
  useEffect(() => {
    async function fetchExisting() {
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id')
        .eq('program_id', programIdStr)
        .eq('order_index', day.order)
        .maybeSingle()

      if (!sessionData) { setLoadingExisting(false); return }

      const { data: logData } = await supabase
        .from('session_logs')
        .select('id, sets')
        .eq('session_id', sessionData.id)
        .eq('client_id', clientIdStr)
        .maybeSingle()

      if (logData) {
        setExistingLogId(logData.id)
        const prefilled: Record<string, { weight: string; reps: string; rpe: string }> = {}
        for (const set of logData.sets as SetLog[]) {
          prefilled[set.exercise] = {
            weight: set.weight > 0 ? String(set.weight) : '',
            reps: set.reps > 0 ? String(set.reps) : '',
            rpe: set.rpe > 0 ? String(set.rpe) : '',
          }
        }
        setLogs((prev) => ({ ...prev, ...prefilled }))
      }
      setLoadingExisting(false)
    }
    fetchExisting()
  }, [])

  function updateLog(exercise: string, field: 'weight' | 'reps' | 'rpe', value: string) {
    setLogs((prev) => ({ ...prev, [exercise]: { ...(prev[exercise] ?? {}), [field]: value } }))
  }

  async function handleSave() {
    const sets: SetLog[] = items
      .filter((e) => logs[e.name]?.weight || logs[e.name]?.reps)
      .map((e) => ({
        exercise: e.name,
        weight: parseFloat(logs[e.name].weight) || 0,
        reps: parseInt(logs[e.name].reps) || 0,
        rpe: parseInt(logs[e.name].rpe) || 0,
      }))

    if (sets.length === 0) {
      Alert.alert('Aucun log', 'Remplis au moins un exercice avant de sauvegarder.')
      return
    }

    setSaving(true)

    const { data: sessionData } = await supabase
      .from('sessions')
      .select('id')
      .eq('program_id', programIdStr)
      .eq('order_index', day.order)
      .maybeSingle()

    let sessionId: string

    if (sessionData) {
      sessionId = sessionData.id
    } else {
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          program_id: programIdStr,
          client_id: clientIdStr,
          day_label: day.day,
          order_index: day.order,
        })
        .select('id')
        .single()

      if (createError || !newSession) {
        Alert.alert('Erreur', createError?.message ?? 'Session non créée')
        setSaving(false)
        return
      }
      sessionId = newSession.id
    }

    let logError: any
    if (existingLogId) {
      const res = await supabase
        .from('session_logs')
        .update({ sets, logged_at: new Date().toISOString() })
        .eq('id', existingLogId)
      logError = res.error
    } else {
      const res = await supabase.from('session_logs').insert({
        session_id: sessionId,
        client_id: clientIdStr,
        sets,
        completed: true,
      })
      logError = res.error
    }

    if (logError) {
      Alert.alert('Erreur', logError.message)
      setSaving(false)
      return
    }

    await detectPRs(clientIdStr, sets)

    setSaving(false)
    const title = existingLogId ? 'Séance mise à jour ✓' : 'Séance enregistrée ! 💪'
    Alert.alert(title, 'Ton coach peut voir ta progression.', [
      { text: 'OK', onPress: () => router.navigate('/(client)') },
    ])
  }

  if (loadingExisting) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#e11d48" />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.navigate('/(client)')}>
        <Text style={styles.backText}>‹ Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{day.day}</Text>
      <Text style={styles.subtitle}>{existingLogId ? 'Modifier ta séance' : 'Logger ta séance'}</Text>

      {items.map((exercise) => (
        <View key={exercise.name} style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exercisePlan}>
            {exercise.sets} × {exercise.reps} · repos {exercise.rest_seconds}s
          </Text>
          {exercise.notes && (
            <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
          )}
          <View style={styles.logRow}>
            <View style={styles.logField}>
              <Text style={styles.logLabel}>Poids (kg)</Text>
              <TextInput
                style={styles.logInput}
                value={logs[exercise.name]?.weight}
                onChangeText={(v) => updateLog(exercise.name, 'weight', v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={styles.logField}>
              <Text style={styles.logLabel}>Reps</Text>
              <TextInput
                style={styles.logInput}
                value={logs[exercise.name]?.reps}
                onChangeText={(v) => updateLog(exercise.name, 'reps', v)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={styles.logField}>
              <Text style={styles.logLabel}>RPE</Text>
              <TextInput
                style={styles.logInput}
                value={logs[exercise.name]?.rpe}
                onChangeText={(v) => updateLog(exercise.name, 'rpe', v)}
                keyboardType="number-pad"
                placeholder="1-10"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveButtonText}>Enregistrer la séance</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

async function detectPRs(clientId: string, sets: SetLog[]) {
  for (const set of sets) {
    if (!set.weight || !set.reps) continue

    const { data: existing } = await supabase
      .from('personal_records')
      .select('weight, reps')
      .eq('client_id', clientIdStr)
      .eq('exercise_name', set.exercise)
      .order('weight', { ascending: false })
      .limit(1)
      .maybeSingle()

    const isNewPR = !existing || set.weight > existing.weight

    if (isNewPR) {
      await supabase.from('personal_records').insert({
        client_id: clientId,
        exercise_name: set.exercise,
        weight: set.weight,
        reps: set.reps,
      })

      Alert.alert(
        '🎯 Nouveau PR !',
        `Tu as battu ton record sur ${set.exercise} : ${set.weight}kg × ${set.reps} reps !`
      )
    }
  }
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#1e293b', paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#e11d48', fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 24 },
  exerciseCard: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 12 },
  exerciseName: { color: '#f8fafc', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  exercisePlan: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  exerciseNotes: { color: '#64748b', fontSize: 12, fontStyle: 'italic', marginBottom: 10 },
  logRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  logField: { flex: 1 },
  logLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  logInput: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 8, padding: 10, fontSize: 15, textAlign: 'center' },
  saveButton: { backgroundColor: '#00bb7f', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  buttonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
