import { useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Share, Clipboard
} from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function formatCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`
}

export default function NewClientScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      setFullName('')
      setEmail('')
      setLoading(false)
      setCreatedCode(null)
    }, [])
  )

  async function handleCreate() {
    if (!fullName.trim()) { Alert.alert('Erreur', 'Le nom est requis'); return }
    if (!email.trim()) { Alert.alert('Erreur', "L'email est requis pour la connexion du client"); return }
    if (!coach) { Alert.alert('Erreur', 'Coach introuvable'); return }

    setLoading(true)

    const code = generateCode()

    const { error } = await supabase
      .from('invite_tokens')
      .insert({
        coach_id: coach.id,
        token: code,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

    setLoading(false)

    if (error) {
      Alert.alert('Erreur', error.message)
      return
    }

    setCreatedCode(code)
  }

  function handleShare() {
    if (!createdCode) return
    Share.share({
      message: `Bonjour ${fullName} ! 👋\n\nTon coach t'a créé un accès sur Johnny App.\n\n1. Télécharge l'app\n2. Sur l'écran de connexion, appuie sur "Première connexion"\n3. Entre ton email (${email}) et ce code : ${formatCode(createdCode)}\n\nÀ tout de suite ! 💪`,
    })
  }

  if (createdCode) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.successCard}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Client créé !</Text>
          <Text style={styles.successName}>{fullName}</Text>
        </View>

        <Text style={styles.codeLabel}>Code d'invitation</Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeText}>{formatCode(createdCode)}</Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => {
              Clipboard.setString(formatCode(createdCode))
              Alert.alert('Copié !', 'Le code a été copié dans le presse-papiers.')
            }}
          >
            <Text style={styles.copyBtnText}>Copier</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.codeHint}>
          Valide 7 jours · Email associé : {email}
        </Text>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Comment ça marche</Text>
          <Text style={styles.instructionStep}>1. Envoie ce code à ton client via WhatsApp / SMS</Text>
          <Text style={styles.instructionStep}>2. Ton client ouvre l'app → "Première connexion"</Text>
          <Text style={styles.instructionStep}>3. Il entre son email et ce code pour créer son compte</Text>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>Partager le message complet</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Retour au dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Nouveau client</Text>
      <Text style={styles.subtitle}>
        Un code d'invitation sera généré. Partage-le à ton client pour qu'il crée son compte.
      </Text>

      <Text style={styles.label}>Nom complet *</Text>
      <TextInput
        style={styles.input}
        placeholder="Jean Dupont"
        placeholderTextColor="#64748b"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Email *</Text>
      <TextInput
        style={styles.input}
        placeholder="jean@email.com"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Création...' : 'Générer le code'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#1e293b', paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#e11d48', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 32, lineHeight: 20 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#334155', color: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 16 },
  button: { backgroundColor: '#e11d48', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  successCard: { alignItems: 'center', marginBottom: 32 },
  successEmoji: { fontSize: 48, marginBottom: 12 },
  successTitle: { color: '#00bb7f', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  successName: { color: '#f8fafc', fontSize: 18, fontWeight: '600' },

  codeLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  codeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e11d48',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codeText: { color: '#f8fafc', fontSize: 36, fontWeight: 'bold', letterSpacing: 6 },
  copyBtn: { backgroundColor: '#e11d48', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  codeHint: { color: '#475569', fontSize: 12, marginBottom: 28, textAlign: 'center' },

  instructions: { backgroundColor: '#334155', borderRadius: 16, padding: 18, marginBottom: 24 },
  instructionsTitle: { color: '#f8fafc', fontWeight: '700', fontSize: 14, marginBottom: 12 },
  instructionStep: { color: '#94a3b8', fontSize: 13, marginBottom: 8, lineHeight: 18 },

  shareBtn: { backgroundColor: '#3080ff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  shareBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  doneBtn: { borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  doneBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
})
