import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ScrollView, TextInput, ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { ClientOnboarding } from '@/types'

const GOAL_LABELS: Record<string, string> = {
  muscle_gain: '💪 Prise de masse',
  weight_loss: '🔥 Perte de poids',
  performance: '⚡ Performance sportive',
  health: '❤️ Santé générale',
}
const LEVEL_LABELS: Record<string, string> = {
  beginner: '🌱 Débutant',
  intermediate: '📈 Intermédiaire',
  advanced: '🏆 Avancé',
}
const EQUIPMENT_LABELS: Record<string, string> = {
  full_gym: '🏋️ Salle complète',
  home_gym: '🏠 Home gym',
  none: '🤸 Aucun matériel',
}

interface ClientData {
  clientId: string
  onboarding: ClientOnboarding | null
  coachName: string | null
}

export default function ClientAccountScreen() {
  const { profile } = useAuth()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Champs éditables
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [injuries, setInjuries] = useState('')

  const fetchData = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('clients')
      .select('id, onboarding, coach:coaches(profile:profiles(full_name))')
      .eq('profile_id', profile.id)
      .single()

    if (data) {
      const coachName = (data.coach as any)?.profile?.full_name ?? null
      setClientData({ clientId: data.id, onboarding: data.onboarding, coachName })
      // Pré-remplir les champs éditables
      const parts = profile.full_name?.split(' ') ?? []
      setFirstName(parts[0] ?? '')
      setLastName(parts.slice(1).join(' ') ?? '')
      setWeight(String(data.onboarding?.weight_kg ?? ''))
      setHeight(String(data.onboarding?.height_cm ?? ''))
      setAge(String(data.onboarding?.age ?? ''))
      setInjuries(data.onboarding?.injuries === 'Aucune' ? '' : (data.onboarding?.injuries ?? ''))
    }
    setLoading(false)
  }, [profile?.id, profile?.full_name])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave() {
    if (!clientData || !profile) return
    setSaving(true)

    const fullName = `${firstName.trim()} ${lastName.trim()}`
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', profile.id)

    if (clientData.onboarding) {
      await supabase.from('clients').update({
        onboarding: {
          ...clientData.onboarding,
          weight_kg: parseFloat(weight) || clientData.onboarding.weight_kg,
          height_cm: parseFloat(height) || clientData.onboarding.height_cm,
          age: parseInt(age) || clientData.onboarding.age,
          injuries: injuries.trim() || 'Aucune',
        }
      }).eq('id', clientData.clientId)
    }

    await fetchData()
    setSaving(false)
    setEditing(false)
  }

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>
  }

  const ob = clientData?.onboarding

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar + nom */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
        {clientData?.coachName && (
          <View style={styles.coachBadge}>
            <Ionicons name="person" size={12} color="#00bb7f" />
            <Text style={styles.coachBadgeText}>Coach : {clientData.coachName}</Text>
          </View>
        )}
      </View>

      {/* Bouton édition */}
      <TouchableOpacity
        style={[styles.editToggle, editing && styles.editToggleActive]}
        onPress={() => editing ? handleSave() : setEditing(true)}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" size="small" />
          : <>
              <Ionicons name={editing ? 'checkmark' : 'create-outline'} size={16} color="#fff" />
              <Text style={styles.editToggleText}>{editing ? 'Enregistrer' : 'Modifier mes infos'}</Text>
            </>
        }
      </TouchableOpacity>
      {editing && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); fetchData() }}>
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>
      )}

      {/* Identité */}
      <SectionTitle title="Identité" />
      {editing ? (
        <View style={styles.card}>
          <EditRow label="Prénom" value={firstName} onChange={setFirstName} />
          <EditRow label="Nom" value={lastName} onChange={setLastName} />
          <EditRow label="Âge" value={age} onChange={setAge} keyboardType="number-pad" suffix="ans" />
        </View>
      ) : (
        <View style={styles.card}>
          <InfoRow icon="person-outline" label="Nom" value={profile?.full_name ?? '—'} />
          <InfoRow icon="calendar-outline" label="Âge" value={ob ? `${ob.age} ans` : '—'} />
        </View>
      )}

      {/* Physique */}
      <SectionTitle title="Physique" />
      {editing ? (
        <View style={styles.card}>
          <EditRow label="Poids" value={weight} onChange={setWeight} keyboardType="decimal-pad" suffix="kg" />
          <EditRow label="Taille" value={height} onChange={setHeight} keyboardType="decimal-pad" suffix="cm" last />
        </View>
      ) : (
        <View style={styles.card}>
          <InfoRow icon="scale-outline" label="Poids" value={ob ? `${ob.weight_kg} kg` : '—'} />
          <InfoRow icon="resize-outline" label="Taille" value={ob ? `${ob.height_cm} cm` : '—'} />
          {ob && (
            <InfoRow
              icon="fitness-outline"
              label="IMC"
              value={(ob.weight_kg / Math.pow(ob.height_cm / 100, 2)).toFixed(1)}
              last
            />
          )}
        </View>
      )}

      {/* Programme */}
      {ob && (
        <>
          <SectionTitle title="Programme" />
          <View style={styles.card}>
            <InfoRow icon="trophy-outline" label="Objectif" value={GOAL_LABELS[ob.goal] ?? ob.goal} />
            <InfoRow icon="bar-chart-outline" label="Niveau" value={LEVEL_LABELS[ob.level] ?? ob.level} />
            <InfoRow icon="time-outline" label="Fréquence" value={`${ob.frequency}x / semaine`} />
            <InfoRow icon="barbell-outline" label="Matériel" value={EQUIPMENT_LABELS[ob.equipment] ?? ob.equipment} last />
          </View>
        </>
      )}

      {/* Blessures */}
      <SectionTitle title="Blessures / Contraintes" />
      {editing ? (
        <View style={styles.card}>
          <TextInput
            style={styles.textarea}
            value={injuries}
            onChangeText={setInjuries}
            placeholder="Ex: douleur genou gauche, épaule fragile... (laisser vide si aucune)"
            placeholderTextColor="#475569"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      ) : (
        <View style={styles.card}>
          <InfoRow
            icon="medkit-outline"
            label="Contraintes"
            value={ob?.injuries && ob.injuries !== 'Aucune' ? ob.injuries : 'Aucune'}
            last
          />
        </View>
      )}

      {/* Déconnexion */}
      <SectionTitle title="Compte" />
      <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#e11d48" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>
}

function InfoRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Ionicons name={icon as any} size={16} color="#475569" style={{ width: 20 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function EditRow({ label, value, onChange, keyboardType, suffix, last }: {
  label: string; value: string; onChange: (v: string) => void
  keyboardType?: any; suffix?: string; last?: boolean
}) {
  return (
    <View style={[styles.editRow, !last && styles.infoRowBorder]}>
      <Text style={styles.editLabel}>{label}</Text>
      <View style={styles.editInputRow}>
        <TextInput
          style={styles.editInput}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType ?? 'default'}
          autoCapitalize="words"
          placeholderTextColor="#475569"
        />
        {suffix && <Text style={styles.editSuffix}>{suffix}</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingTop: 64, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },

  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#3080ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  name: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  coachBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#00bb7f15', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: '#00bb7f30' },
  coachBadgeText: { color: '#00bb7f', fontSize: 12, fontWeight: '600' },

  editToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#334155', borderRadius: 12, padding: 13, marginBottom: 8 },
  editToggleActive: { backgroundColor: '#00bb7f' },
  editToggleText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: { alignItems: 'center', marginBottom: 16 },
  cancelBtnText: { color: '#64748b', fontSize: 13 },

  sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 8, paddingHorizontal: 4 },

  card: { backgroundColor: '#1e293b', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#334155' },
  infoLabel: { color: '#64748b', fontSize: 14, flex: 1 },
  infoValue: { color: '#f8fafc', fontSize: 14, fontWeight: '500', textAlign: 'right', flexShrink: 1, maxWidth: '55%' },

  editRow: { paddingHorizontal: 16, paddingVertical: 12 },
  editLabel: { color: '#64748b', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  editInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, color: '#f8fafc', fontSize: 16, fontWeight: '500', backgroundColor: '#0f172a', borderRadius: 10, padding: 10 },
  editSuffix: { color: '#475569', fontSize: 14, fontWeight: '600' },

  textarea: { color: '#f8fafc', fontSize: 14, padding: 16, minHeight: 100, textAlignVertical: 'top' },

  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e11d4830', marginTop: 4 },
  logoutText: { color: '#e11d48', fontSize: 15, fontWeight: '600' },
})
