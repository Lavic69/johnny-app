# Phase 3 — Coach : Génération IA de programmes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le coach peut générer un programme d'entraînement via GPT-4o mini à partir du profil client, le reviewer, l'éditer et l'approuver. Le client reçoit le programme approuvé dans son interface.

**Architecture:** Client OpenAI appelé depuis l'app mobile via `lib/openai.ts`. Le programme généré est un JSON structuré (tableau de jours avec exercices). Le coach voit le résultat, peut modifier chaque exercice inline, puis approuver → update Supabase.

**Tech Stack:** OpenAI SDK (gpt-4o-mini), Supabase JS v2, Expo Router, TypeScript

---

## Task 1 : Client OpenAI + builder de prompt

**Files:**
- Create: `lib/openai.ts`

- [ ] **Step 1 : Créer `lib/openai.ts`**

```typescript
import OpenAI from 'openai'
import { ENV } from './env'
import type { ClientOnboarding, Exercise } from '@/types'

export const openai = new OpenAI({
  apiKey: ENV.openaiApiKey,
  dangerouslyAllowBrowser: true,
})

export interface ProgramDay {
  day: string
  order: number
  items: Exercise[]
}

export function buildProgramPrompt(onboarding: ClientOnboarding, coachNotes: string): string {
  const goalLabels: Record<ClientOnboarding['goal'], string> = {
    muscle_gain: 'prise de masse musculaire',
    weight_loss: 'perte de poids',
    performance: 'performance sportive',
    health: 'santé générale',
  }
  const levelLabels: Record<ClientOnboarding['level'], string> = {
    beginner: 'débutant',
    intermediate: 'intermédiaire',
    advanced: 'avancé',
  }
  const equipmentLabels: Record<ClientOnboarding['equipment'], string> = {
    full_gym: 'salle de sport complète',
    home_gym: 'home gym (haltères, barre)',
    none: 'aucun matériel (poids du corps uniquement)',
  }

  return `Tu es un coach sportif expert. Génère un programme d'entraînement hebdomadaire structuré pour ce client.

PROFIL CLIENT :
- Objectif : ${goalLabels[onboarding.goal]}
- Niveau : ${levelLabels[onboarding.level]}
- Matériel : ${equipmentLabels[onboarding.equipment]}
- Fréquence souhaitée : ${onboarding.frequency} jours/semaine
- Âge : ${onboarding.age} ans, Poids : ${onboarding.weight_kg}kg, Taille : ${onboarding.height_cm}cm
- Blessures/contre-indications : ${onboarding.injuries || 'aucune'}

NOTES DU COACH :
${coachNotes || 'Aucune note spécifique.'}

INSTRUCTIONS :
- Génère exactement ${onboarding.frequency} jours d'entraînement
- Pour chaque jour, fournis 4 à 6 exercices
- Les séries doivent être adaptées au niveau du client
- Réponds UNIQUEMENT avec un JSON valide, sans texte autour

FORMAT JSON ATTENDU :
[
  {
    "day": "Jour 1 — Poitrine & Triceps",
    "order": 1,
    "items": [
      {
        "name": "Développé couché",
        "sets": 4,
        "reps": "8-12",
        "rest_seconds": 90,
        "notes": "Descendre lentement, 3 secondes en excentrique"
      }
    ]
  }
]`
}

export async function generateProgram(
  onboarding: ClientOnboarding,
  coachNotes: string
): Promise<ProgramDay[]> {
  const prompt = buildProgramPrompt(onboarding, coachNotes)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('Réponse IA vide')

  // GPT retourne un objet JSON — on cherche le tableau dedans
  const parsed = JSON.parse(content)
  const days: ProgramDay[] = Array.isArray(parsed) ? parsed : parsed.program ?? parsed.days ?? Object.values(parsed)[0]

  if (!Array.isArray(days)) throw new Error('Format IA invalide')
  return days
}
```

- [ ] **Step 2 : Commit**

```bash
git add lib/openai.ts
git commit -m "feat: add OpenAI client and program generation logic"
```

---

## Task 2 : Écran de génération de programme

**Files:**
- Create: `app/(coach)/programs/generate.tsx`
- Create: `app/(coach)/programs/_layout.tsx`

- [ ] **Step 1 : Créer `app/(coach)/programs/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function ProgramsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 2 : Créer `app/(coach)/programs/generate.tsx`**

```typescript
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { generateProgram, type ProgramDay } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'
import type { ClientOnboarding } from '@/types'

export default function GenerateProgramScreen() {
  const { clientId, onboardingJson } = useLocalSearchParams<{
    clientId: string
    onboardingJson: string
  }>()
  const router = useRouter()
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)

  const onboarding: ClientOnboarding = JSON.parse(onboardingJson ?? '{}')

  const [coachNotes, setCoachNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [program, setProgram] = useState<ProgramDay[] | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    setProgram(null)
    try {
      const result = await generateProgram(onboarding, coachNotes)
      setProgram(result)
    } catch (e: any) {
      Alert.alert('Erreur IA', e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove() {
    if (!program || !coach) return
    setSaving(true)

    const { error } = await supabase.from('programs').insert({
      client_id: clientId,
      coach_id: coach.id,
      status: 'approved',
      exercises: program,
      coach_notes: coachNotes,
      ai_prompt: coachNotes,
      approved_at: new Date().toISOString(),
    })

    setSaving(false)

    if (error) { Alert.alert('Erreur', error.message); return }

    Alert.alert('Programme envoyé !', 'Le client peut maintenant consulter son programme.', [
      { text: 'OK', onPress: () => router.back() },
    ])
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Générer un programme</Text>

      <Text style={styles.label}>Notes pour l'IA (optionnel)</Text>
      <TextInput
        style={styles.textarea}
        placeholder="Ex: Focus sur les jambes ce mois, éviter les squats lourds..."
        placeholderTextColor="#64748b"
        value={coachNotes}
        onChangeText={setCoachNotes}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={[styles.generateButton, generating && styles.buttonDisabled]}
        onPress={handleGenerate}
        disabled={generating}
      >
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.generateButtonText}>
              {program ? '↻ Regénérer' : '✨ Générer avec l\'IA'}
            </Text>
        }
      </TouchableOpacity>

      {program && (
        <>
          <Text style={styles.resultTitle}>Programme généré</Text>
          {program.map((day) => (
            <DayCard key={day.order} day={day} />
          ))}

          <TouchableOpacity
            style={[styles.approveButton, saving && styles.buttonDisabled]}
            onPress={handleApprove}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.approveButtonText}>✓ Approuver et envoyer au client</Text>
            }
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  )
}

function DayCard({ day }: { day: ProgramDay }) {
  return (
    <View style={styles.dayCard}>
      <Text style={styles.dayTitle}>{day.day}</Text>
      {day.items.map((exercise, i) => (
        <View key={i} style={styles.exerciseRow}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseMeta}>
            {exercise.sets} × {exercise.reps} · repos {exercise.rest_seconds}s
          </Text>
          {exercise.notes && (
            <Text style={styles.exerciseNotes}>{exercise.notes}</Text>
          )}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#1e293b', paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#e11d48', fontSize: 16 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f8fafc', marginBottom: 24 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  textarea: { backgroundColor: '#334155', color: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  generateButton: { backgroundColor: '#3080ff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  generateButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  buttonDisabled: { opacity: 0.5 },
  resultTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', marginBottom: 16 },
  dayCard: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 12 },
  dayTitle: { color: '#e11d48', fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  exerciseRow: { marginBottom: 10 },
  exerciseName: { color: '#f8fafc', fontWeight: '600', fontSize: 14 },
  exerciseMeta: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  exerciseNotes: { color: '#64748b', fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  approveButton: { backgroundColor: '#00bb7f', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16, marginBottom: 40 },
  approveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
```

- [ ] **Step 3 : Commit**

```bash
git add app/(coach)/programs/
git commit -m "feat: program generation screen with GPT-4o-mini"
```

---

## Task 3 : Bouton "Générer programme" dans la vue client

**Files:**
- Modify: `app/(coach)/clients/[id]/index.tsx`

Ajoute un bouton dans le header de la vue client pour accéder à la génération.

- [ ] **Step 1 : Modifier `app/(coach)/clients/[id]/index.tsx`**

Ajouter l'import du router (déjà présent) et ajouter un bouton dans le header, après l'avatarRow :

Trouver le bloc `</View>` qui ferme `avatarRow`, et juste après ajouter :

```typescript
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
```

Et ajouter dans `StyleSheet.create` :
```typescript
generateBtn: { backgroundColor: '#3080ff', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 16 },
generateBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
```

- [ ] **Step 2 : Commit**

```bash
git add "app/(coach)/clients/[id]/index.tsx"
git commit -m "feat: add generate program button on client detail"
```

---

## Task 4 : Vue programme côté coach (onglet Entraînement)

**Files:**
- Create: `hooks/usePrograms.ts`
- Modify: `app/(coach)/clients/[id]/index.tsx` (remplacer PlaceholderTab training)

- [ ] **Step 1 : Créer `hooks/usePrograms.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Program } from '@/types'

export function useClientPrograms(clientId: string | null) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }

    supabase
      .from('programs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPrograms((data as Program[]) ?? [])
        setLoading(false)
      })
  }, [clientId])

  return { programs, loading }
}
```

- [ ] **Step 2 : Remplacer `PlaceholderTab` training dans `app/(coach)/clients/[id]/index.tsx`**

Remplacer :
```typescript
{activeTab === 'training' && <PlaceholderTab label="Programmes — Phase 3" />}
```

Par :
```typescript
{activeTab === 'training' && <TrainingTab clientId={id} />}
```

Et ajouter la fonction `TrainingTab` (avant ou après `PlaceholderTab`) :

```typescript
function TrainingTab({ clientId }: { clientId: string }) {
  const { programs, loading } = useClientPrograms(clientId)

  if (loading) return <ActivityIndicator color="#e11d48" style={{ marginTop: 40 }} />

  if (programs.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabContentText}>Aucun programme pour ce client.</Text>
      </View>
    )
  }

  return (
    <View style={{ padding: 16 }}>
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
    </View>
  )
}

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
```

Ajouter l'import en haut du fichier :
```typescript
import { useClientPrograms } from '@/hooks/usePrograms'
```

- [ ] **Step 3 : Commit**

```bash
git add hooks/usePrograms.ts "app/(coach)/clients/[id]/index.tsx"
git commit -m "feat: training tab shows client programs list"
```

---

## Résultat de la Phase 3

À la fin de cette phase :
- `lib/openai.ts` : client GPT-4o-mini + builder de prompt en français
- Coach peut cliquer "Générer un programme" depuis la fiche client
- L'IA génère le programme en JSON structuré
- Le coach voit le programme, peut regénérer, puis approuver → sauvegardé en Supabase
- L'onglet Entraînement de la fiche client affiche l'historique des programmes

**Prochaine phase :** Phase 4 — Client : programme + logger séances + PRs
