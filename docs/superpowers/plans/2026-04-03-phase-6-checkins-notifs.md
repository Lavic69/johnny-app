# Phase 6 — Check-ins hebdo + Notifications push

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le client soumet un check-in hebdomadaire (énergie, récupération, moral 1-5). Le coach voit les check-ins dans l'onglet dédié. Notifications push configurées pour les événements clés.

**Architecture:** Écran check-in avec 3 questions slider-style. Hook `useCheckins` côté coach. Expo Notifications pour les push (enregistrement du token, envoi via Supabase Edge Function simplifié en V1 → on stocke juste le token pour l'instant).

**Tech Stack:** Expo Notifications, Supabase JS v2, TypeScript

---

## Task 1 : Écran check-in client

**Files:**
- Modify: `app/(client)/checkin.tsx`

- [ ] **Step 1 : Réécrire `app/(client)/checkin.tsx`**

```typescript
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
  { key: 'energy', label: 'Niveau d\'énergie cette semaine', emoji: '⚡' },
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
```

- [ ] **Step 2 : Commit**

```bash
git add app/(client)/checkin.tsx
git commit -m "feat: weekly check-in screen with 1-5 ratings"
```

---

## Task 2 : Onglet Check-ins côté coach

**Files:**
- Create: `hooks/useCheckins.ts`
- Modify: `app/(coach)/clients/[id]/index.tsx` (remplacer PlaceholderTab checkins)

- [ ] **Step 1 : Créer `hooks/useCheckins.ts`**

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { WeeklyCheckin } from '@/types'

export function useCheckins(clientId: string | null) {
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientId) { setLoading(false); return }

    supabase
      .from('weekly_checkins')
      .select('*')
      .eq('client_id', clientId)
      .order('week_start', { ascending: false })
      .limit(12)
      .then(({ data }) => {
        setCheckins((data as WeeklyCheckin[]) ?? [])
        setLoading(false)
      })
  }, [clientId])

  return { checkins, loading }
}
```

- [ ] **Step 2 : Modifier `app/(coach)/clients/[id]/index.tsx`**

Ajouter l'import :
```typescript
import { useCheckins } from '@/hooks/useCheckins'
```

Remplacer :
```typescript
{activeTab === 'checkins' && <PlaceholderTab label="Check-ins — Phase 6" />}
```

Par :
```typescript
{activeTab === 'checkins' && <CheckinsTab clientId={id} />}
```

Ajouter la fonction `CheckinsTab` :
```typescript
function CheckinsTab({ clientId }: { clientId: string }) {
  const { checkins, loading } = useCheckins(clientId)

  if (loading) return <ActivityIndicator color="#e11d48" style={{ marginTop: 40 }} />

  if (checkins.length === 0) {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.tabContentText}>Aucun check-in pour ce client.</Text>
      </View>
    )
  }

  return (
    <View style={{ padding: 16 }}>
      {checkins.map((c) => (
        <View key={c.id} style={checkinStyles.card}>
          <Text style={checkinStyles.week}>
            Semaine du {new Date(c.week_start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </Text>
          <View style={checkinStyles.scores}>
            <ScoreBadge label="Énergie" value={c.energy} />
            <ScoreBadge label="Récup" value={c.recovery} />
            <ScoreBadge label="Moral" value={c.mood} />
          </View>
        </View>
      ))}
    </View>
  )
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 4 ? '#00bb7f' : value >= 3 ? '#ff8b1a' : '#e11d48'
  return (
    <View style={checkinStyles.badge}>
      <Text style={[checkinStyles.badgeValue, { color }]}>{value}/5</Text>
      <Text style={checkinStyles.badgeLabel}>{label}</Text>
    </View>
  )
}

const checkinStyles = StyleSheet.create({
  card: { backgroundColor: '#334155', borderRadius: 16, padding: 16, marginBottom: 10 },
  week: { color: '#94a3b8', fontSize: 13, marginBottom: 10, textTransform: 'capitalize' },
  scores: { flexDirection: 'row', gap: 8 },
  badge: { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 10, alignItems: 'center' },
  badgeValue: { fontSize: 18, fontWeight: 'bold' },
  badgeLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
})
```

- [ ] **Step 3 : Commit**

```bash
git add hooks/useCheckins.ts "app/(coach)/clients/[id]/index.tsx"
git commit -m "feat: check-ins tab on coach client view"
```

---

## Task 3 : Notifications push (enregistrement token)

**Files:**
- Create: `lib/notifications.ts`
- Modify: `app/_layout.tsx`

En V1 on enregistre le push token Expo dans les métadonnées du profil. L'envoi de notifs se fera manuellement ou via une Edge Function future.

- [ ] **Step 1 : Créer `lib/notifications.ts`**

```typescript
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerPushToken(userId: string): Promise<void> {
  if (!Device.isDevice) return

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data

  await supabase
    .from('profiles')
    .update({ avatar_url: token })  // Réutilise avatar_url temporairement — remplacer par une colonne push_token en V2
    .eq('id', userId)
}
```

Note : en V1 on stocke le token dans `avatar_url` temporairement. À remplacer par une migration ajoutant une colonne `push_token` avant la mise en production.

- [ ] **Step 2 : Modifier `app/_layout.tsx`** pour appeler `registerPushToken` au login

Lire le fichier actuel, puis ajouter l'import et l'appel :

```typescript
import { registerPushToken } from '@/lib/notifications'
```

Dans le `useEffect`, après la détection de session, ajouter :
```typescript
if (session?.user?.id) {
  registerPushToken(session.user.id)
}
```

- [ ] **Step 3 : Commit**

```bash
git add lib/notifications.ts app/_layout.tsx
git commit -m "feat: register push token on login"
```

---

## Résultat de la Phase 6

- Client peut faire son check-in hebdo (énergie, récup, moral 1-5), une fois par semaine
- Coach voit l'historique des check-ins avec code couleur (vert ≥ 4, orange = 3, rouge < 3)
- Token push enregistré au login pour préparer les notifications futures

**Prochaine phase :** Phase 7 — Admin (activation comptes coaches)
