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
import { useAIConsent } from '@/hooks/useAIConsent'
import AIConsentModal from '@/components/AIConsentModal'
import type { ClientOnboarding } from '@/types'

export default function GenerateProgramScreen() {
  const { clientId, onboardingJson } = useLocalSearchParams<{
    clientId: string
    onboardingJson: string
  }>()
  const router = useRouter()
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)
  const { consentState, accept, decline } = useAIConsent(profile?.id)

  const onboarding: ClientOnboarding = JSON.parse(onboardingJson ?? '{}')

  const [coachNotes, setCoachNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [program, setProgram] = useState<ProgramDay[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [consentModalVisible, setConsentModalVisible] = useState(false)

  async function runGenerate() {
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

  async function handleGenerate() {
    if (consentState === 'pending') { setConsentModalVisible(true); return }
    if (consentState === 'declined') {
      Alert.alert('IA désactivée', 'Tu as refusé le partage de données avec OpenAI. Va dans ton profil pour modifier ce choix.')
      return
    }
    await runGenerate()
  }

  async function handleConsentAccept() {
    await accept()
    setConsentModalVisible(false)
    await runGenerate()
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
              {program ? '↻ Regénérer' : "✨ Générer avec l'IA"}
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
      <AIConsentModal
        visible={consentModalVisible}
        dataDescription="Le profil du client (objectif, niveau, blessures, matériel) et tes notes pour générer son programme d'entraînement personnalisé."
        onAccept={handleConsentAccept}
        onDecline={() => { decline(); setConsentModalVisible(false) }}
      />
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
