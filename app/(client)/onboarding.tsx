import { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface FormData {
  // Étape 1 — Identité
  firstName: string
  lastName: string
  age: string
  // Étape 2 — Physique
  weight_kg: string
  height_cm: string
  // Étape 3 — Objectif
  goal: string
  // Étape 4 — Niveau
  level: string
  // Étape 5 — Fréquence
  frequency: string
  // Étape 6 — Matériel
  equipment: string
  // Étape 7 — Blessures
  injuries: string
}

const GOALS = [
  { key: 'muscle_gain', label: '💪 Prise de masse' },
  { key: 'weight_loss', label: '🔥 Perte de poids' },
  { key: 'performance', label: '⚡ Performance sportive' },
  { key: 'health', label: '❤️ Santé générale' },
]

const LEVELS = [
  { key: 'beginner', label: '🌱 Débutant — moins de 1 an' },
  { key: 'intermediate', label: '📈 Intermédiaire — 1 à 3 ans' },
  { key: 'advanced', label: '🏆 Avancé — plus de 3 ans' },
]

const FREQUENCIES = [
  { key: '2', label: '2 fois / semaine' },
  { key: '3', label: '3 fois / semaine' },
  { key: '4', label: '4 fois / semaine' },
  { key: '5', label: '5 fois ou plus / semaine' },
]

const EQUIPMENT = [
  { key: 'full_gym', label: '🏋️ Salle complète' },
  { key: 'home_gym', label: '🏠 Home gym (quelques équipements)' },
  { key: 'none', label: '🤸 Aucun matériel (poids de corps)' },
]

const TOTAL_STEPS = 7

export default function ClientOnboardingScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<FormData>({
    firstName: profile?.full_name?.split(' ')[0] ?? '',
    lastName: profile?.full_name?.split(' ').slice(1).join(' ') ?? '',
    age: '',
    weight_kg: '',
    height_cm: '',
    goal: '',
    level: '',
    frequency: '',
    equipment: '',
    injuries: '',
  })

  function set(field: keyof FormData, value: string) {
    setData(prev => ({ ...prev, [field]: value }))
  }

  function canNext(): boolean {
    switch (step) {
      case 0: return data.firstName.trim().length > 0 && data.lastName.trim().length > 0 && data.age.trim().length > 0
      case 1: return data.weight_kg.trim().length > 0 && data.height_cm.trim().length > 0
      case 2: return data.goal.length > 0
      case 3: return data.level.length > 0
      case 4: return data.frequency.length > 0
      case 5: return data.equipment.length > 0
      case 6: return true // injuries est optionnel
      default: return false
    }
  }

  async function handleFinish() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`

    // Mettre à jour le nom dans le profil
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id)

    // Sauvegarder l'onboarding
    const { error } = await supabase
      .from('clients')
      .update({
        onboarding: {
          goal: data.goal,
          level: data.level,
          equipment: data.equipment,
          frequency: parseInt(data.frequency) || 3,
          weight_kg: parseFloat(data.weight_kg) || 0,
          height_cm: parseFloat(data.height_cm) || 0,
          age: parseInt(data.age) || 0,
          injuries: data.injuries.trim() || 'Aucune',
        }
      })
      .eq('profile_id', user.id)

    if (error) {
      Alert.alert('Erreur', error.message)
      setSaving(false)
      return
    }

    router.replace('/(client)')
  }

  const isLast = step === TOTAL_STEPS - 1

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View key={i} style={[styles.progressSeg, i <= step && styles.progressActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.stepLabel}>Étape {step + 1} sur {TOTAL_STEPS}</Text>

        {/* Étape 1 — Identité */}
        {step === 0 && (
          <>
            <Text style={styles.question}>C'est parti ! 👋{'\n'}Comment tu t'appelles ?</Text>
            <Text style={styles.sub}>Ton coach utilisera ces infos pour personnaliser ton suivi.</Text>
            <Text style={styles.label}>Prénom *</Text>
            <TextInput style={styles.input} value={data.firstName} onChangeText={v => set('firstName', v)} placeholder="Jean" placeholderTextColor="#475569" autoCapitalize="words" />
            <Text style={styles.label}>Nom *</Text>
            <TextInput style={styles.input} value={data.lastName} onChangeText={v => set('lastName', v)} placeholder="Dupont" placeholderTextColor="#475569" autoCapitalize="words" />
            <Text style={styles.label}>Âge *</Text>
            <TextInput style={styles.input} value={data.age} onChangeText={v => set('age', v)} placeholder="28" placeholderTextColor="#475569" keyboardType="number-pad" />
          </>
        )}

        {/* Étape 2 — Physique */}
        {step === 1 && (
          <>
            <Text style={styles.question}>Tes mensurations</Text>
            <Text style={styles.sub}>Ces données permettent à ton coach de calibrer ton programme et tes objectifs nutritionnels.</Text>
            <Text style={styles.label}>Poids actuel (kg) *</Text>
            <TextInput style={[styles.input, styles.inputLarge]} value={data.weight_kg} onChangeText={v => set('weight_kg', v)} placeholder="75" placeholderTextColor="#475569" keyboardType="decimal-pad" />
            <Text style={styles.label}>Taille (cm) *</Text>
            <TextInput style={[styles.input, styles.inputLarge]} value={data.height_cm} onChangeText={v => set('height_cm', v)} placeholder="178" placeholderTextColor="#475569" keyboardType="decimal-pad" />
            {data.weight_kg && data.height_cm && (
              <View style={styles.imc}>
                <Text style={styles.imcText}>
                  IMC estimé : {(parseFloat(data.weight_kg) / Math.pow(parseFloat(data.height_cm) / 100, 2)).toFixed(1)}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Étape 3 — Objectif */}
        {step === 2 && (
          <>
            <Text style={styles.question}>Quel est ton objectif principal ?</Text>
            <Text style={styles.sub}>Ton coach adaptera l'intensité et le volume en conséquence.</Text>
            {GOALS.map(opt => (
              <RadioOption key={opt.key} label={opt.label} selected={data.goal === opt.key} onPress={() => set('goal', opt.key)} />
            ))}
          </>
        )}

        {/* Étape 4 — Niveau */}
        {step === 3 && (
          <>
            <Text style={styles.question}>Quel est ton niveau en musculation ?</Text>
            <Text style={styles.sub}>Sois honnête — ça aide à calibrer l'intensité des séances.</Text>
            {LEVELS.map(opt => (
              <RadioOption key={opt.key} label={opt.label} selected={data.level === opt.key} onPress={() => set('level', opt.key)} />
            ))}
          </>
        )}

        {/* Étape 5 — Fréquence */}
        {step === 4 && (
          <>
            <Text style={styles.question}>Combien de fois par semaine peux-tu t'entraîner ?</Text>
            <Text style={styles.sub}>Ton programme sera structuré selon ta disponibilité.</Text>
            {FREQUENCIES.map(opt => (
              <RadioOption key={opt.key} label={opt.label} selected={data.frequency === opt.key} onPress={() => set('frequency', opt.key)} />
            ))}
          </>
        )}

        {/* Étape 6 — Matériel */}
        {step === 5 && (
          <>
            <Text style={styles.question}>Quel matériel as-tu à disposition ?</Text>
            <Text style={styles.sub}>Les exercices seront adaptés à ce que tu as.</Text>
            {EQUIPMENT.map(opt => (
              <RadioOption key={opt.key} label={opt.label} selected={data.equipment === opt.key} onPress={() => set('equipment', opt.key)} />
            ))}
          </>
        )}

        {/* Étape 7 — Blessures */}
        {step === 6 && (
          <>
            <Text style={styles.question}>As-tu des blessures ou contre-indications ?</Text>
            <Text style={styles.sub}>Cette information est cruciale pour éviter les exercices à risque. Laisse vide si aucune.</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={data.injuries}
              onChangeText={v => set('injuries', v)}
              placeholder="Ex: douleur genou gauche, hernie discale L4-L5, épaule fragile..."
              placeholderTextColor="#475569"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={styles.optionalHint}>Champ optionnel</Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnText}>← Retour</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, (!canNext() || saving) && styles.nextBtnDisabled, step === 0 && styles.nextBtnFull]}
          onPress={() => isLast ? handleFinish() : setStep(s => s + 1)}
          disabled={!canNext() || saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>{isLast ? '✓ Terminer mon profil' : 'Continuer →'}</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function RadioOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.option, selected && styles.optionSelected]} onPress={onPress} activeOpacity={0.75}>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
      {selected && <View style={styles.optionCheck}><Text style={styles.optionCheckText}>✓</Text></View>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, paddingTop: 60, marginBottom: 28 },
  progressSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#1e293b' },
  progressActive: { backgroundColor: '#e11d48' },

  content: { paddingHorizontal: 24, paddingBottom: 20 },
  stepLabel: { color: '#475569', fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  question: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold', marginBottom: 8, lineHeight: 32 },
  sub: { color: '#64748b', fontSize: 14, lineHeight: 20, marginBottom: 28 },

  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 14, padding: 16, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  inputLarge: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  textarea: { minHeight: 120, fontSize: 15, lineHeight: 22 },

  imc: { backgroundColor: '#3080ff15', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#3080ff30', marginTop: 4 },
  imcText: { color: '#3080ff', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  optionalHint: { color: '#334155', fontSize: 12, textAlign: 'center', marginTop: 8 },

  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1e293b', borderRadius: 14, padding: 18,
    marginBottom: 10, borderWidth: 1.5, borderColor: '#334155',
  },
  optionSelected: { borderColor: '#e11d48', backgroundColor: '#e11d4812' },
  optionText: { color: '#94a3b8', fontSize: 15, fontWeight: '500', flex: 1 },
  optionTextSelected: { color: '#f8fafc', fontWeight: '700' },
  optionCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e11d48', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  optionCheckText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#1e293b' },
  backBtn: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: '#1e293b' },
  backBtnText: { color: '#64748b', fontWeight: '600', fontSize: 15 },
  nextBtn: { flex: 2, backgroundColor: '#e11d48', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextBtnFull: { flex: 1 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
