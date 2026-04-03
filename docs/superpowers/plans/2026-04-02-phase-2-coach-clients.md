# Phase 2 — Coach : Gestion clients + invitations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Interface coach fonctionnelle — dashboard liste clients, création d'un client avec lien d'invitation, et vue détaillée par client (onglets entraînement / nutrition / check-ins).

**Architecture:** Hooks React Query-style (useState + useEffect + Supabase) pour fetcher les données. Pas de lib externe de state management — Supabase realtime suffit pour la V1.

**Tech Stack:** Expo Router, Supabase JS v2, TypeScript strict, React Native core components

---

## Task 1 : Hook useCoach

**Files:**
- Create: `hooks/useCoach.ts`

Ce hook récupère l'enregistrement `coaches` lié au profil de l'utilisateur connecté.

- [ ] **Step 1 : Créer `hooks/useCoach.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Coach } from '@/types'

interface CoachState {
  coach: Coach | null
  loading: boolean
  error: string | null
}

export function useCoach(profileId: string | null): CoachState {
  const [coach, setCoach] = useState<Coach | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) { setLoading(false); return }

    supabase
      .from('coaches')
      .select('*')
      .eq('profile_id', profileId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCoach(data)
        setLoading(false)
      })
  }, [profileId])

  return { coach, loading, error }
}
```

- [ ] **Step 2 : Commit**

```bash
git add hooks/useCoach.ts
git commit -m "feat: add useCoach hook"
```

---

## Task 2 : Hook useClients

**Files:**
- Create: `hooks/useClients.ts`

Ce hook récupère la liste des clients d'un coach avec leurs profils.

- [ ] **Step 1 : Créer `hooks/useClients.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Client, Profile } from '@/types'

export interface ClientWithProfile extends Client {
  profile: Profile
}

interface ClientsState {
  clients: ClientWithProfile[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useClients(coachId: string | null): ClientsState {
  const [clients, setClients] = useState<ClientWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!coachId) { setLoading(false); return }
    setLoading(true)

    const { data, error } = await supabase
      .from('clients')
      .select('*, profile:profiles(*)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setClients((data as ClientWithProfile[]) ?? [])
    setLoading(false)
  }, [coachId])

  useEffect(() => { fetch() }, [fetch])

  return { clients, loading, error, refetch: fetch }
}
```

- [ ] **Step 2 : Commit**

```bash
git add hooks/useClients.ts
git commit -m "feat: add useClients hook"
```

---

## Task 3 : Dashboard coach (liste clients)

**Files:**
- Modify: `app/(coach)/index.tsx`

Remplace le placeholder par le vrai dashboard.

- [ ] **Step 1 : Réécrire `app/(coach)/index.tsx`**

```typescript
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { useCoach } from '@/hooks/useCoach'
import { useClients } from '@/hooks/useClients'
import type { ClientWithProfile } from '@/hooks/useClients'

export default function CoachDashboard() {
  const router = useRouter()
  const { profile } = useAuth()
  const { coach } = useCoach(profile?.id ?? null)
  const { clients, loading } = useClients(coach?.id ?? null)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#e11d48" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes clients</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(coach)/clients/new')}
        >
          <Text style={styles.addButtonText}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {clients.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun client pour l'instant.</Text>
          <Text style={styles.emptySubtext}>Ajoutez votre premier client pour commencer.</Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClientCard client={item} onPress={() => router.push(`/(coach)/clients/${item.id}`)} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  )
}

function ClientCard({ client, onPress }: { client: ClientWithProfile; onPress: () => void }) {
  const hasOnboarding = !!client.onboarding

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>
          {client.profile.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{client.profile.full_name}</Text>
        <Text style={styles.cardStatus}>
          {hasOnboarding ? '✓ Profil complété' : '⏳ En attente d\'onboarding'}
        </Text>
      </View>
      <Text style={styles.cardChevron}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc' },
  addButton: { backgroundColor: '#e11d48', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { color: '#f8fafc', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  emptySubtext: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e11d48', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardAvatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cardInfo: { flex: 1 },
  cardName: { color: '#f8fafc', fontWeight: '600', fontSize: 16 },
  cardStatus: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  cardChevron: { color: '#64748b', fontSize: 22 },
})
```

- [ ] **Step 2 : Commit**

```bash
git add app/(coach)/index.tsx
git commit -m "feat: coach dashboard with client list"
```

---

## Task 4 : Création client + génération d'invitation

**Files:**
- Create: `app/(coach)/clients/new.tsx`
- Create: `app/(coach)/clients/_layout.tsx`

- [ ] **Step 1 : Créer `app/(coach)/clients/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function ClientsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 2 : Créer `app/(coach)/clients/new.tsx`**

```typescript
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

    // 1. Créer un compte utilisateur via Supabase Auth (invite par email)
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'

    const { data: authData, error: authError } = await supabase.auth.admin
      ? // En production, utiliser une Edge Function pour créer le compte côté serveur
        { data: null, error: new Error('Admin API non disponible côté client') }
      : { data: null, error: null }

    // Approche V1 simplifiée : créer un invite token et partager le lien
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
      'Client créé !',
      `Lien d'invitation généré pour ${fullName}.`,
      [
        {
          text: 'Partager le lien',
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
```

- [ ] **Step 3 : Commit**

```bash
git add app/(coach)/clients/
git commit -m "feat: new client screen with invite token generation"
```

---

## Task 5 : Vue détaillée client (tabs)

**Files:**
- Create: `app/(coach)/clients/[id]/index.tsx`
- Create: `app/(coach)/clients/[id]/_layout.tsx`

- [ ] **Step 1 : Créer `app/(coach)/clients/[id]/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function ClientDetailLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 2 : Créer `app/(coach)/clients/[id]/index.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Client, Profile } from '@/types'

type Tab = 'training' | 'nutrition' | 'checkins'

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('training')
  const [client, setClient] = useState<(Client & { profile: Profile }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('clients')
      .select('*, profile:profiles(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setClient(data as (Client & { profile: Profile }))
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#e11d48" /></View>
  }

  if (!client) {
    return <View style={styles.center}><Text style={styles.errorText}>Client introuvable</Text></View>
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Retour</Text>
        </TouchableOpacity>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{client.profile.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.name}>{client.profile.full_name}</Text>
            <Text style={styles.meta}>
              {client.onboarding ? `${client.onboarding.goal?.replace('_', ' ')} · ${client.onboarding.level}` : 'Onboarding non complété'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['training', 'nutrition', 'checkins'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'training' ? 'Entraînement' : tab === 'nutrition' ? 'Nutrition' : 'Check-ins'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'training' && <TrainingTab clientId={id} />}
        {activeTab === 'nutrition' && <NutritionTab clientId={id} />}
        {activeTab === 'checkins' && <CheckinsTab clientId={id} />}
      </ScrollView>
    </View>
  )
}

function TrainingTab({ clientId }: { clientId: string }) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabContentText}>Programmes d'entraînement — Phase 3</Text>
    </View>
  )
}

function NutritionTab({ clientId }: { clientId: string }) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabContentText}>Suivi nutrition — Phase 5</Text>
    </View>
  )
}

function CheckinsTab({ clientId }: { clientId: string }) {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.tabContentText}>Check-ins hebdomadaires — Phase 6</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e293b' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  errorText: { color: '#94a3b8' },
  header: { padding: 20, paddingTop: 60 },
  back: { color: '#e11d48', fontSize: 16, marginBottom: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e11d48', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 22 },
  name: { color: '#f8fafc', fontWeight: 'bold', fontSize: 20 },
  meta: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#334155' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#e11d48' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#e11d48' },
  content: { flex: 1 },
  tabContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  tabContentText: { color: '#64748b', textAlign: 'center' },
})
```

- [ ] **Step 3 : Commit**

```bash
git add app/(coach)/clients/\[id\]/
git commit -m "feat: client detail view with training/nutrition/checkins tabs"
```

---

## Résultat de la Phase 2

À la fin de cette phase :
- Le coach voit la liste de ses clients sur le dashboard
- Il peut créer un client et générer un lien d'invitation
- Il peut accéder à la vue détaillée d'un client avec 3 onglets (placeholder pour phases 3, 5, 6)

**Prochaine phase :** Phase 3 — Génération IA de programmes
