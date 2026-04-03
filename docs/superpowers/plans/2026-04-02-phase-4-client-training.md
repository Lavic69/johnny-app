# Phase 4 — Client : Programme + Logger séances + PRs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le client voit son programme approuvé, peut logger ses séances (poids, reps, RPE), et l'app détecte automatiquement les nouveaux Personal Records.

**Architecture:** Hook `useActiveProgram` pour récupérer le programme actif. Vue semaine affichant les jours. Vue séance avec les exercices à logger. Détection PR après chaque log via comparaison avec `personal_records`.

**Tech Stack:** Expo Router, Supabase JS v2, TypeScript

---

## Task 1 : Hook useActiveProgram

**Files:**
- Create: `hooks/useActiveProgram.ts`

- [ ] **Step 1 : Créer `hooks/useActiveProgram.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Program } from '@/types'
import type { ProgramDay } from '@/lib/openai'

export interface ActiveProgram extends Omit<Program, 'exercises'> {
  exercises: ProgramDay[]
}

export function useActiveProgram(clientId: string | null) {
  const [program, setProgram] = useState<ActiveProgram | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }

    supabase
      .from('programs')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setProgram(data as ActiveProgram ?? null)
        setLoading(false)
      })
  }, [clientId])

  return { program, loading }
}
```

- [ ] **Step 2 : Commit**

```bash
git add hooks/useActiveProgram.ts
git commit -m "feat: add useActiveProgram hook"
```

---

## Task 2 : Hook useClientId

**Files:**
- Create: `hooks/useClientId.ts`

Ce hook récupère l'id du client lié au profil connecté.

- [ ] **Step 1 : Créer `hooks/useClientId.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function useClientId(profileId: string | null) {
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }

    supabase
      .from('clients')
      .select('id')
      .eq('profile_id', profileId)
      .single()
      .then(({ data }) => {
        setClientId(data?.id ?? null)
        setLoading(false)
      })
  }, [profileId])

  return { clientId, loading }
}
```

- [ ] **Step 2 : Commit**

```bash
git add hooks/useClientId.ts
git commit -m "feat: add useClientId hook"
```

---

## Task 3 : Écran programme client (vue semaine)

**Files:**
- Modify: `app/(client)/index.tsx`

- [ ] **Step 1 : Réécrire `app/(client)/index.tsx`**

```typescript
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
```

- [ ] **Step 2 : Commit**

```bash
git add app/(client)/index.tsx
git commit -m "feat: client home shows active program week view"
```

---

## Task 4 : Écran logger une séance

**Files:**
- Create: `app/(client)/session/[dayOrder].tsx`
- Create: `app/(client)/session/_layout.tsx`

- [ ] **Step 1 : Créer `app/(client)/session/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function SessionLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 2 : Créer `app/(client)/session/[dayOrder].tsx`**

```typescript
import { useState } from 'react'
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

  const day: ProgramDay = JSON.parse(dayJson ?? '{}')

  // logs[exerciseName] = { weight: string, reps: string, rpe: string }
  const [logs, setLogs] = useState<Record<string, { weight: string; reps: string; rpe: string }>>(
    () => Object.fromEntries(day.items.map((e) => [e.name, { weight: '', reps: '', rpe: '' }]))
  )
  const [saving, setSaving] = useState(false)

  function updateLog(exercise: string, field: 'weight' | 'reps' | 'rpe', value: string) {
    setLogs((prev) => ({ ...prev, [exercise]: { ...prev[exercise], [field]: value } }))
  }

  async function handleSave() {
    const sets: SetLog[] = day.items
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

    // 1. Trouver ou créer la session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('program_id', programId)
      .eq('order_index', day.order)
      .maybeSingle()

    let sessionId: string

    if (sessionData) {
      sessionId = sessionData.id
    } else {
      const { data: newSession, error: createError } = await supabase
        .from('sessions')
        .insert({
          program_id: programId,
          client_id: clientId,
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

    // 2. Sauvegarder le log
    const { error: logError } = await supabase.from('session_logs').insert({
      session_id: sessionId,
      client_id: clientId,
      sets,
      completed: true,
    })

    if (logError) {
      Alert.alert('Erreur', logError.message)
      setSaving(false)
      return
    }

    // 3. Détecter les PRs
    await detectPRs(clientId, sets)

    setSaving(false)
    Alert.alert('Séance enregistrée ! 💪', 'Ton coach peut voir ta progression.', [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{day.day}</Text>
      <Text style={styles.subtitle}>Logger ta séance</Text>

      {day.items.map((exercise) => (
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
      .eq('client_id', clientId)
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
```

- [ ] **Step 3 : Commit**

```bash
git add app/(client)/session/
git commit -m "feat: session logging screen with PR detection"
```

---

## Résultat de la Phase 4

À la fin de cette phase :
- `app/(client)/index.tsx` : liste les jours du programme actif
- `app/(client)/session/[dayOrder].tsx` : formulaire de log (poids, reps, RPE par exercice)
- PR auto-détecté après chaque log → Alert "Nouveau PR !"
- Coach peut voir les logs via Supabase (phases suivantes afficheront ces données côté coach)

**Prochaine phase :** Phase 5 — Tracker nutritionnel (barcode + recherche)
