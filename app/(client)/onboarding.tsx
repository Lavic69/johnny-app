import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { ClientOnboarding } from '@/types'

const GOALS = [
  { key: 'muscle_gain', label: '💪 Prise de masse' },
  { key: 'weight_loss', label: '🔥 Perte de poids' },
  { key: 'performance', label: '⚡ Performance' },
  { key: 'health', label: '❤️ Santé générale' },
] as const

const LEVELS = [
  { key: 'beginner', label: '🌱 Débutant' },
  { key: 'intermediate', label: '📈 Intermédiaire' },
  { key: 'advanced', label: '🏆 Avancé' },
] as const

const EQUIPMENT = [
  { key: 'full_gym', label: '🏋️ Salle complète' },
  { key: 'home_gym', label: '🏠 Home gym' },
  { key: 'none', label: '🤸 Aucun matériel' },
] as const

type StepKey = 'goal' | 'level' | 'equipment'

const STEPS: { key: StepKey; label: string; sub: string; options: readonly { key: string; label: string }[] }[] = [
  { key: 'goal', label: 'Quel est ton objectif ?', sub: 'Ton coach adaptera ton programme en conséquence.', options: GOALS },
  { key: 'level', label: 'Quel est ton niveau ?', sub: 'Sois honnête, ça aide à calibrer l\'intensité.', options: LEVELS },
  { key: 'equipment', label: 'Quel matériel as-tu ?', sub: 'On adaptera les exercices à ce que tu as.', options: EQUIPMENT },
]

export default function ClientOnboardingScreen() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<ClientOnboarding>>({})
  const [saving, setSaving] = useState(false)

  async function handleFinish() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase
      .from('clients')
      .update({ onboarding: data })
      .eq('profile_id', user.id)

    if (error) {
      Alert.alert('Erreur', error.message)
      setSaving(false)
      return
    }

    router.replace('/(client)')
  }

  const currentStep = STEPS[step]
  const currentValue = data[currentStep.key]
  const isLast = step === STEPS.length - 1

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.progressSegment, i <= step && styles.progressActive]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.stepLabel}>Étape {step + 1} sur {STEPS.length}</Text>
        <Text style={styles.question}>{currentStep.label}</Text>
        <Text style={styles.sub}>{currentStep.sub}</Text>

        <View style={styles.options}>
          {currentStep.options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.option, currentValue === opt.key && styles.optionSelected]}
              onPress={() => setData(prev => ({ ...prev, [currentStep.key]: opt.key }))}
              activeOpacity={0.75}
            >
              <Text style={[styles.optionText, currentValue === opt.key && styles.optionTextSelected]}>
                {opt.label}
              </Text>
              {currentValue === opt.key && (
                <View style={styles.optionCheck}>
                  <Text style={styles.optionCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, (!currentValue || saving) && styles.nextBtnDisabled, step === 0 && styles.nextBtnFull]}
          onPress={() => isLast ? handleFinish() : setStep(s => s + 1)}
          disabled={!currentValue || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>{isLast ? 'Terminer mon profil' : 'Continuer →'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },

  progressBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 60, marginBottom: 32 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#1e293b' },
  progressActive: { backgroundColor: '#e11d48' },

  content: { paddingHorizontal: 24, paddingBottom: 20 },
  stepLabel: { color: '#475569', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  question: { color: '#f8fafc', fontSize: 26, fontWeight: 'bold', marginBottom: 8, lineHeight: 34 },
  sub: { color: '#64748b', fontSize: 14, lineHeight: 20, marginBottom: 32 },

  options: { gap: 12 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1e293b', borderRadius: 16,
    padding: 18, borderWidth: 1.5, borderColor: '#334155',
  },
  optionSelected: { borderColor: '#e11d48', backgroundColor: '#e11d4815' },
  optionText: { color: '#94a3b8', fontSize: 16, fontWeight: '500' },
  optionTextSelected: { color: '#f8fafc', fontWeight: '700' },
  optionCheck: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#e11d48',
    justifyContent: 'center', alignItems: 'center',
  },
  optionCheckText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: '#1e293b',
  },
  backBtn: {
    flex: 1, borderRadius: 14, padding: 16,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1e293b',
  },
  backBtnText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  nextBtn: {
    flex: 2, backgroundColor: '#e11d48',
    borderRadius: 14, padding: 16, alignItems: 'center',
  },
  nextBtnFull: { flex: 1 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
