import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Share } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'

export default function NewClientScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!fullName.trim()) { Alert.alert('Erreur', 'Le nom est requis'); return }
    if (!coach) { Alert.alert('Erreur', 'Coach introuvable'); return }

    setLoading(true)

    const { data: tokenData, error: tokenError } = await supabase
      .from('invite_tokens')
      .insert({ coach_id: coach.id, email: email.trim() || null })
      .select('token')
      .single()

    if (tokenError) {
      Alert.alert('Erreur', tokenError.message)
      setLoading(false)
      return
    }

    const inviteLink = `johnnyapp://invite/${tokenData.token}`

    setLoading(false)

    Alert.alert(
      'Invitation créée !',
      `Lien d'invitation généré pour ${fullName}.`,
      [
        {
          text: 'Partager',
          onPress: () => Share.share({
            message: `Bonjour ${fullName} ! Télécharge l'app Johnny et utilise ce lien pour te connecter : ${inviteLink}`,
          }),
        },
        { text: 'Fermer', onPress: () => router.back() },
      ]
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>‹ Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Nouveau client</Text>
      <Text style={styles.subtitle}>Un lien d'invitation sera généré à partager avec votre client.</Text>

      <Text style={styles.label}>Nom complet *</Text>
      <TextInput
        style={styles.input}
        placeholder="Jean Dupont"
        placeholderTextColor="#64748b"
        value={fullName}
        onChangeText={setFullName}
      />

      <Text style={styles.label}>Email (optionnel)</Text>
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
        <Text style={styles.buttonText}>{loading ? 'Création...' : 'Créer et générer le lien'}</Text>
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
})
