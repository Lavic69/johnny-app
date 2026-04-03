import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useClientId } from '@/hooks/useClientId'

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

interface CheckinValues {
  energy: number
  recovery: number
  mood: number
}

const QUESTIONS: { key: keyof CheckinValues; label: string; emoji: string }[] = [
  { key: 'energy', label: "Niveau d'énergie cette semaine", emoji: '⚡' },
  { key: 'recovery', label: 'Qualité de la récupération', emoji: '🛌' },
  { key: 'mood', label: 'Moral général', emoji: '🧠' },
]

export default function CheckinScreen() {
  const { profile } = useAuth()
  const { clientId } = useClientId(profile?.id ?? null)
  const [values, setValues] = useState<CheckinValues>({ energy: 0, recovery: 0, mood: 0 })
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const weekStart = getMonday(new Date())

  useEffect(() => {
    if (!clientId) return
    supabase
      .from('weekly_checkins')
      .select('id, energy, recovery, mood')
      .eq('client_id', clientId)
      .eq('week_start', weekStart)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setValues({ energy: data.energy, recovery: data.recovery, mood: data.mood })
          setAlreadyDone(true)
        }
        setLoading(false)
      })
  }, [clientId, weekStart])

  async function handleSubmit() {
    if (!clientId) return
    if (values.energy === 0 || values.recovery === 0 || values.mood === 0) {
      Alert.alert('Incomplet', 'Réponds à toutes les questions avant de valider.')
      return
    }
    setSaving(true)

    const { error } = await supabase.from('weekly_checkins').upsert({
      client_id: clientId,
      week_start: weekStart,
      energy: values.energy,
      recovery: values.recovery,
      mood: values.mood,
    }, { onConflict: 'client_id,week_start' })

    setSaving(false)
    if (error) { Alert.alert('Erreur', error.message); return }
    setAlreadyDone(true)
    Alert.alert('Check-in envoyé ! ✅', 'Ton coach peut voir comment tu te sens cette semaine.')
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Check-in hebdo</Text>
      <Text style={styles.subtitle}>
        Semaine du {new Date(weekStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
      </Text>

      {alreadyDone && (
        <View style={styles.doneBanner}>
          <Text style={styles.doneBannerText}>✅ Check-in déjà soumis cette semaine</Text>
        </View>
      )}

      {QUESTIONS.map((q) => (
        <View key={q.key} style={styles.questionBlock}>
          <Text style={styles.questionLabel}>{q.emoji} {q.label}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.ratingBtn, values[q.key] === n && styles.ratingBtnActive]}
                onPress={() => !alreadyDone && setValues((prev) => ({ ...prev, [q.key]: n }))}
              >
                <Text style={[styles.ratingBtnText, values[q.key] === n && styles.ratingBtnTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.ratingHints}>
            <Text style={styles.ratingHint}>Très faible</Text>
            <Text style={styles.ratingHint}>Excellent</Text>
          </View>
        </View>
      ))}

      {!alreadyDone && (
        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Envoyer mon check-in</Text>
          }
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#1e293b', paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 24, textTransform: 'capitalize' },
  doneBanner: { backgroundColor: '#00bb7f22', borderRadius: 12, padding: 14, marginBottom: 24 },
  doneBannerText: { color: '#00bb7f', fontWeight: '600', textAlign: 'center' },
  questionBlock: { marginBottom: 32 },
  questionLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingBtn: { flex: 1, aspectRatio: 1, backgroundColor: '#334155', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  ratingBtnActive: { backgroundColor: '#e11d48' },
  ratingBtnText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 18 },
  ratingBtnTextActive: { color: '#fff' },
  ratingHints: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  ratingHint: { color: '#475569', fontSize: 11 },
  submitBtn: { backgroundColor: '#00bb7f', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
