import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { ClientOnboarding } from '@/types'

const GOALS = [
  { key: 'muscle_gain', label: 'Prise de masse' },
  { key: 'weight_loss', label: 'Perte de poids' },
  { key: 'performance', label: 'Performance' },
  { key: 'health', label: 'Santé générale' },
] as const

const LEVELS = [
  { key: 'beginner', label: 'Débutant' },
  { key: 'intermediate', label: 'Intermédiaire' },
  { key: 'advanced', label: 'Avancé' },
] as const

const EQUIPMENT = [
  { key: 'full_gym', label: 'Salle complète' },
  { key: 'home_gym', label: 'Home gym' },
  { key: 'none', label: 'Aucun matériel' },
] as const

type StepKey = 'goal' | 'level' | 'equipment'

const STEPS: { key: StepKey; label: string; options: readonly { key: string; label: string }[] }[] = [
  { key: 'goal', label: 'Quel est ton objectif principal ?', options: GOALS },
  { key: 'level', label: 'Quel est ton niveau ?', options: LEVELS },
  { key: 'equipment', label: 'Quel matériel as-tu ?', options: EQUIPMENT },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<ClientOnboarding>>({})

  async function handleFinish() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('clients')
      .update({ onboarding: data })
      .eq('profile_id', user.id)

    if (error) { Alert.alert('Erreur', error.message); return }
    router.replace('/(client)')
  }

  const currentStep = STEPS[step]
  const currentValue = data[currentStep.key]

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progress}>{step + 1} / {STEPS.length}</Text>
      <Text style={styles.question}>{currentStep.label}</Text>
      {currentStep.options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.option, currentValue === opt.key && styles.selected]}
          onPress={() => setData(prev => ({ ...prev, [currentStep.key]: opt.key }))}
        >
          <Text style={styles.optionText}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.next, !currentValue && styles.disabled]}
        onPress={() => step < STEPS.length - 1 ? setStep(s => s + 1) : handleFinish()}
        disabled={!currentValue}
      >
        <Text style={styles.nextText}>{step < STEPS.length - 1 ? 'Suivant →' : 'Terminer'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#1e293b', justifyContent: 'center' },
  progress: { color: '#64748b', textAlign: 'center', marginBottom: 8 },
  question: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center', marginBottom: 32 },
  option: { backgroundColor: '#334155', borderRadius: 12, padding: 18, marginBottom: 12 },
  selected: { backgroundColor: '#e11d48' },
  optionText: { color: '#f8fafc', fontSize: 16, textAlign: 'center' },
  next: { backgroundColor: '#00bb7f', borderRadius: 12, padding: 16, marginTop: 24, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  nextText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
