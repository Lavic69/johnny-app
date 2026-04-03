import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

type Step = 'code' | 'password'

export default function RedeemScreen() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('code')

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Data fetched after code validation
  const [tokenData, setTokenData] = useState<{
    id: string
    coach_id: string
    full_name: string
  } | null>(null)

  async function handleValidateCode() {
    const rawCode = code.replace(/-/g, '').trim().toUpperCase()
    if (!email.trim()) { Alert.alert('Erreur', "L'email est requis"); return }
    if (rawCode.length !== 6) { Alert.alert('Erreur', 'Le code doit faire 6 caractères (ex: ABC-123)'); return }

    setLoading(true)

    const { data, error } = await supabase
      .from('invite_tokens')
      .select('id, coach_id, full_name, email')
      .eq('token', rawCode)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    setLoading(false)

    if (error || !data) {
      Alert.alert('Code invalide', 'Ce code est incorrect, déjà utilisé ou expiré. Demande un nouveau code à ton coach.')
      return
    }

    if (data.email && data.email.toLowerCase() !== email.trim().toLowerCase()) {
      Alert.alert('Email incorrect', "L'email ne correspond pas à l'invitation. Utilise l'adresse email que ton coach a enregistrée.")
      return
    }

    setTokenData({ id: data.id, coach_id: data.coach_id, full_name: data.full_name ?? '' })
    setStep('password')
  }

  async function handleCreateAccount() {
    if (password.length < 8) { Alert.alert('Erreur', 'Le mot de passe doit faire au moins 8 caractères'); return }
    if (!tokenData) return

    setLoading(true)

    // 1. Créer le compte Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    })

    if (signUpError) {
      const msg = signUpError.message.includes('rate limit') || signUpError.message.includes('email')
        ? "Trop de tentatives ou email bloqué. Si le problème persiste, demande à ton coach de contacter l'administrateur."
        : signUpError.message
      Alert.alert('Erreur création compte', msg)
      setLoading(false)
      return
    }

    if (!authData.user) {
      Alert.alert('Erreur', 'Compte non créé. Vérifie ta boîte mail pour confirmer ton email, ou désactive la confirmation email dans Supabase.')
      setLoading(false)
      return
    }

    // Si session null = confirmation email requise → pas supporté en V1
    if (!authData.session) {
      Alert.alert(
        'Confirmation email requise',
        'Le projet Supabase requiert une confirmation email. Désactive cette option dans Authentication → Email → "Confirm email".'
      )
      setLoading(false)
      return
    }

    const userId = authData.user.id

    // 2. Mettre à jour le profil avec le nom (créé automatiquement par le trigger)
    await supabase
      .from('profiles')
      .update({ full_name: tokenData.full_name })
      .eq('id', userId)

    // 3. Créer l'enregistrement client lié au coach
    const { error: clientError } = await supabase
      .from('clients')
      .insert({ profile_id: userId, coach_id: tokenData.coach_id })

    if (clientError) {
      Alert.alert('Erreur', clientError.message)
      setLoading(false)
      return
    }

    // 4. Marquer le token comme utilisé
    await supabase
      .from('invite_tokens')
      .update({ used: true })
      .eq('id', tokenData.id)

    setLoading(false)
    // Le root layout détecte la session et redirige automatiquement vers /(client)
  }

  if (step === 'password') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => setStep('code')}>
          <Text style={styles.backText}>‹ Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Crée ton compte</Text>
        <Text style={styles.subtitle}>
          Bienvenue {tokenData?.full_name} ! Choisis un mot de passe pour accéder à l'app.
        </Text>

        <Text style={styles.label}>Mot de passe</Text>
        <TextInput
          style={styles.input}
          placeholder="8 caractères minimum"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          autoCorrect={false}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleCreateAccount}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Créer mon compte</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Première connexion</Text>
      <Text style={styles.subtitle}>
        Ton coach t'a envoyé un code d'invitation. Entre ton email et le code pour créer ton compte.
      </Text>

      <Text style={styles.label}>Ton email</Text>
      <TextInput
        style={styles.input}
        placeholder="jean@email.com"
        placeholderTextColor="#64748b"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={styles.label}>Code d'invitation</Text>
      <TextInput
        style={[styles.input, styles.codeInput]}
        placeholder="ABC-123"
        placeholderTextColor="#64748b"
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={7}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleValidateCode}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Valider le code</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#1e293b', paddingTop: 60 },
  back: { marginBottom: 24 },
  backText: { color: '#e11d48', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 32, lineHeight: 22 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#334155', color: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 16 },
  codeInput: { fontSize: 24, fontWeight: 'bold', letterSpacing: 4, textAlign: 'center' },
  button: { backgroundColor: '#e11d48', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
