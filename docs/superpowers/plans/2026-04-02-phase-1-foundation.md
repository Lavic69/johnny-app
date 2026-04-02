# Phase 1 — Foundation : Setup, DB Schema, Auth, Navigation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Projet Expo fonctionnel avec navigation role-based, auth Supabase, schéma DB complet et flux d'invitation client.

**Architecture:** Expo Router v3 pour la navigation file-based, Supabase pour l'auth et la DB, Row Level Security pour isoler les données par rôle.

**Tech Stack:** Expo SDK 52+, Expo Router v3, Supabase JS v2, TypeScript strict

---

## Task 1 : Initialiser le projet Expo

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `app/_layout.tsx`

- [ ] **Step 1 : Créer le projet**

```bash
npx create-expo-app@latest johnny-app --template blank-typescript
cd johnny-app
```

- [ ] **Step 2 : Installer les dépendances**

```bash
npx expo install expo-router expo-constants expo-linking expo-status-bar react-native-safe-area-context react-native-screens
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
npx expo install openai
npx expo install expo-camera expo-barcode-scanner
npx expo install expo-notifications expo-device
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3 : Configurer app.json**

```json
{
  "expo": {
    "name": "Johnny App",
    "slug": "johnny-app",
    "version": "1.0.0",
    "scheme": "johnnyapp",
    "platforms": ["ios", "android"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.johnny.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Scanner les codes-barres des produits alimentaires"
      }
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#e11d48"
      },
      "package": "com.johnny.app",
      "permissions": ["CAMERA"]
    },
    "plugins": [
      "expo-router",
      "expo-barcode-scanner",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#e11d48"
        }
      ]
    ]
  }
}
```

- [ ] **Step 4 : Configurer tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 5 : Configurer Jest (package.json)**

Ajouter dans `package.json` :

```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  }
}
```

- [ ] **Step 6 : Commit**

```bash
git init
git add .
git commit -m "feat: init Expo project with TypeScript and dependencies"
```

---

## Task 2 : Variables d'environnement

**Files:**
- Create: `.env.local`, `lib/env.ts`, `.gitignore`

- [ ] **Step 1 : Créer `.env.local`**

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
EXPO_PUBLIC_OPENAI_API_KEY=sk-xxx
```

- [ ] **Step 2 : Créer `lib/env.ts`**

```typescript
export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY!,
} as const
```

- [ ] **Step 3 : Mettre à jour `.gitignore`**

```
node_modules/
.expo/
dist/
.env.local
*.env
```

- [ ] **Step 4 : Commit**

```bash
git add .gitignore lib/env.ts app.json
git commit -m "feat: add environment config"
```

---

## Task 3 : Schéma Supabase

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1 : Créer le fichier de migration**

```sql
-- supabase/migrations/001_initial_schema.sql

-- Profiles (extension de auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('coach', 'client', 'admin')),
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Coaches
create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('active', 'pending')),
  created_at timestamptz default now()
);

-- Invite tokens
create table public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  email text,
  used boolean not null default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  coach_id uuid not null references public.coaches on delete cascade,
  onboarding jsonb,
  nutrition_goal jsonb,
  created_at timestamptz default now()
);

-- Programmes
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  coach_id uuid not null references public.coaches on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  exercises jsonb not null default '[]',
  coach_notes text,
  ai_prompt text,
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- Séances planifiées
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  day_label text not null,
  order_index int not null
);

-- Logs de séances
create table public.session_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  sets jsonb not null default '[]',
  completed boolean not null default false,
  logged_at timestamptz default now()
);

-- Personal Records
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  exercise_name text not null,
  weight numeric not null,
  reps int not null,
  achieved_at timestamptz default now()
);

-- Journal alimentaire
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  logged_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  foods jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Repas sauvegardés
create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  name text not null,
  foods jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Check-ins hebdomadaires
create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  week_start date not null,
  energy int not null check (energy between 1 and 5),
  recovery int not null check (recovery between 1 and 5),
  mood int not null check (mood between 1 and 5),
  created_at timestamptz default now(),
  unique (client_id, week_start)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.invite_tokens enable row level security;
alter table public.clients enable row level security;
alter table public.programs enable row level security;
alter table public.sessions enable row level security;
alter table public.session_logs enable row level security;
alter table public.personal_records enable row level security;
alter table public.food_logs enable row level security;
alter table public.saved_meals enable row level security;
alter table public.weekly_checkins enable row level security;

-- Policies profiles
create policy "Users can read their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Policies coaches : un coach lit son propre enregistrement
create policy "Coach reads own record"
  on public.coaches for select using (profile_id = auth.uid());

-- Policies clients : coach voit ses clients, client voit son propre enregistrement
create policy "Coach sees own clients"
  on public.clients for select using (
    coach_id in (select id from public.coaches where profile_id = auth.uid())
  );

create policy "Client sees own record"
  on public.clients for select using (profile_id = auth.uid());

-- Policies programs
create policy "Coach manages own programs"
  on public.programs for all using (
    coach_id in (select id from public.coaches where profile_id = auth.uid())
  );

create policy "Client reads own approved programs"
  on public.programs for select using (
    client_id in (select id from public.clients where profile_id = auth.uid())
    and status = 'approved'
  );

-- Trigger : créer un profile après signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 2 : Appliquer la migration dans Supabase**

Depuis le Dashboard Supabase → SQL Editor, coller et exécuter le contenu du fichier.

Ou via CLI :
```bash
npx supabase db push
```

- [ ] **Step 3 : Commit**

```bash
git add supabase/
git commit -m "feat: add initial Supabase schema with RLS"
```

---

## Task 4 : Client Supabase + Types globaux

**Files:**
- Create: `lib/supabase.ts`, `types/index.ts`

- [ ] **Step 1 : Créer `lib/supabase.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ENV } from './env'
import type { Database } from '@/types/supabase'

export const supabase = createClient<Database>(
  ENV.supabaseUrl,
  ENV.supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

- [ ] **Step 2 : Créer `types/index.ts`**

```typescript
export type Role = 'coach' | 'client' | 'admin'
export type CoachStatus = 'active' | 'pending'
export type ProgramStatus = 'draft' | 'approved'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface Profile {
  id: string
  role: Role
  full_name: string
  avatar_url: string | null
  created_at: string
}

export interface Coach {
  id: string
  profile_id: string
  status: CoachStatus
  created_at: string
}

export interface ClientOnboarding {
  goal: 'muscle_gain' | 'weight_loss' | 'performance' | 'health'
  level: 'beginner' | 'intermediate' | 'advanced'
  injuries: string
  equipment: 'full_gym' | 'home_gym' | 'none'
  frequency: number
  weight_kg: number
  height_cm: number
  age: number
}

export interface NutritionGoal {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface Client {
  id: string
  profile_id: string
  coach_id: string
  onboarding: ClientOnboarding | null
  nutrition_goal: NutritionGoal | null
  created_at: string
}

export interface Exercise {
  name: string
  sets: number
  reps: string
  rest_seconds: number
  notes?: string
}

export interface Program {
  id: string
  client_id: string
  coach_id: string
  status: ProgramStatus
  exercises: { day: string; order: number; items: Exercise[] }[]
  coach_notes: string | null
  created_at: string
  approved_at: string | null
}

export interface SetLog {
  exercise: string
  weight: number
  reps: number
  rpe: number
}

export interface SessionLog {
  id: string
  session_id: string
  client_id: string
  sets: SetLog[]
  completed: boolean
  logged_at: string
}

export interface PersonalRecord {
  id: string
  client_id: string
  exercise_name: string
  weight: number
  reps: number
  achieved_at: string
}

export interface FoodItem {
  name: string
  barcode?: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  quantity_g: number
}

export interface FoodLog {
  id: string
  client_id: string
  logged_date: string
  meal_type: MealType
  foods: FoodItem[]
  created_at: string
}

export interface WeeklyCheckin {
  id: string
  client_id: string
  week_start: string
  energy: number
  recovery: number
  mood: number
  created_at: string
}
```

- [ ] **Step 3 : Test unitaire `lib/supabase.ts`**

Create: `__tests__/lib/supabase.test.ts`

```typescript
import { supabase } from '@/lib/supabase'

describe('supabase client', () => {
  it('is initialized', () => {
    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
  })
})
```

- [ ] **Step 4 : Lancer le test**

```bash
npx jest __tests__/lib/supabase.test.ts
```

Expected: PASS

- [ ] **Step 5 : Commit**

```bash
git add lib/ types/ __tests__/
git commit -m "feat: add Supabase client and global types"
```

---

## Task 5 : Hook d'authentification

**Files:**
- Create: `hooks/useAuth.ts`

- [ ] **Step 1 : Écrire le test**

Create: `__tests__/hooks/useAuth.test.ts`

```typescript
import { renderHook } from '@testing-library/react-native'
import { useAuth } from '@/hooks/useAuth'

describe('useAuth', () => {
  it('returns session as null initially', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(true)
  })
})
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
npx jest __tests__/hooks/useAuth.test.ts
```

Expected: FAIL — "Cannot find module '@/hooks/useAuth'"

- [ ] **Step 3 : Créer `hooks/useAuth.ts`**

```typescript
import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Role } from '@/types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  role: Role | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (session) fetchProfile(session.user.id)
        else { setProfile(null); setLoading(false) }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  return { session, profile, role: profile?.role ?? null, loading }
}
```

- [ ] **Step 4 : Relancer le test**

```bash
npx jest __tests__/hooks/useAuth.test.ts
```

Expected: PASS

- [ ] **Step 5 : Commit**

```bash
git add hooks/useAuth.ts __tests__/hooks/useAuth.test.ts
git commit -m "feat: add useAuth hook with session and profile"
```

---

## Task 6 : Root layout + Auth gate

**Files:**
- Create: `app/_layout.tsx`

- [ ] **Step 1 : Créer `app/_layout.tsx`**

```typescript
import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'

export default function RootLayout() {
  const { session, role, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && role === 'coach' && segments[0] !== '(coach)') {
      router.replace('/(coach)')
    } else if (session && role === 'client' && segments[0] !== '(client)') {
      router.replace('/(client)')
    } else if (session && role === 'admin' && segments[0] !== '(admin)') {
      router.replace('/(admin)')
    }
  }, [session, role, loading, segments])

  if (loading) return null

  return <Slot />
}
```

- [ ] **Step 2 : Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add root layout with role-based auth gate"
```

---

## Task 7 : Écran de login

**Files:**
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`

- [ ] **Step 1 : Créer `app/(auth)/_layout.tsx`**

```typescript
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 2 : Créer `app/(auth)/login.tsx`**

```typescript
import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) Alert.alert('Erreur', error.message)
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Johnny App</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#1e293b' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f8fafc', marginBottom: 32, textAlign: 'center' },
  input: { backgroundColor: '#334155', color: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#e11d48', borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
```

- [ ] **Step 3 : Commit**

```bash
git add app/(auth)/
git commit -m "feat: add login screen"
```

---

## Task 8 : Navigations coach et client (tabs vides)

**Files:**
- Create: `app/(coach)/_layout.tsx`, `app/(coach)/index.tsx`
- Create: `app/(client)/_layout.tsx`, `app/(client)/index.tsx`

- [ ] **Step 1 : Créer `app/(coach)/_layout.tsx`**

```typescript
import { Tabs } from 'expo-router'

export default function CoachLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#e11d48', tabBarStyle: { backgroundColor: '#1e293b' } }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
    </Tabs>
  )
}
```

- [ ] **Step 2 : Créer `app/(coach)/index.tsx` (placeholder)**

```typescript
import { View, Text, StyleSheet } from 'react-native'

export default function CoachDashboard() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Dashboard Coach — à implémenter en Phase 2</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  text: { color: '#94a3b8', textAlign: 'center' },
})
```

- [ ] **Step 3 : Créer `app/(client)/_layout.tsx`**

```typescript
import { Tabs } from 'expo-router'

export default function ClientLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#e11d48', tabBarStyle: { backgroundColor: '#1e293b' } }}>
      <Tabs.Screen name="index" options={{ title: 'Programme' }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Nutrition' }} />
      <Tabs.Screen name="checkin" options={{ title: 'Check-in' }} />
    </Tabs>
  )
}
```

- [ ] **Step 4 : Créer `app/(client)/index.tsx` (placeholder)**

```typescript
import { View, Text, StyleSheet } from 'react-native'

export default function ClientHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Programme Client — à implémenter en Phase 4</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e293b' },
  text: { color: '#94a3b8', textAlign: 'center' },
})
```

- [ ] **Step 5 : Lancer l'app et vérifier la navigation**

```bash
npx expo start
```

Vérifier :
- Login screen s'affiche si non connecté
- Après login coach → tabs Coach (Dashboard, Clients)
- Après login client → tabs Client (Programme, Nutrition, Check-in)

- [ ] **Step 6 : Commit**

```bash
git add app/(coach)/ app/(client)/
git commit -m "feat: add coach and client tab navigators"
```

---

## Task 9 : Onboarding client (formulaire)

**Files:**
- Create: `app/(auth)/onboarding.tsx`

- [ ] **Step 1 : Créer `app/(auth)/onboarding.tsx`**

```typescript
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

export default function OnboardingScreen() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<Partial<ClientOnboarding>>({})

  const steps = [
    { key: 'goal', label: 'Quel est ton objectif principal ?', options: GOALS },
    { key: 'level', label: 'Quel est ton niveau ?', options: LEVELS },
    { key: 'equipment', label: 'Quel matériel as-tu ?', options: EQUIPMENT },
  ]

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

  const currentStep = steps[step]

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.progress}>{step + 1} / {steps.length}</Text>
      <Text style={styles.question}>{currentStep.label}</Text>
      {currentStep.options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.option, data[currentStep.key as keyof ClientOnboarding] === opt.key && styles.selected]}
          onPress={() => setData(prev => ({ ...prev, [currentStep.key]: opt.key }))}
        >
          <Text style={styles.optionText}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={styles.next}
        onPress={() => step < steps.length - 1 ? setStep(s => s + 1) : handleFinish()}
        disabled={!data[currentStep.key as keyof ClientOnboarding]}
      >
        <Text style={styles.nextText}>{step < steps.length - 1 ? 'Suivant →' : 'Terminer'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#1e293b', justifyContent: 'center' },
  progress: { color: '#64748b', textAlign: 'center', marginBottom: 8 },
  question: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center', marginBottom: 32 },
  option: { backgroundColor: '#334155', borderRadius: 12, padding: 18, marginBottom: 12 },
  selected: { backgroundColor: '#e11d48' },
  optionText: { color: '#f8fafc', fontSize: 16, textAlign: 'center' },
  next: { backgroundColor: '#00bb7f', borderRadius: 12, padding: 16, marginTop: 24, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})
```

- [ ] **Step 2 : Mettre à jour le root layout pour rediriger vers onboarding si client sans profil**

Dans `app/_layout.tsx`, modifier la condition client :

```typescript
} else if (session && role === 'client') {
  // Vérifier si l'onboarding est fait (géré dans le hook useAuth via le profil client)
  if (segments[0] !== '(client)' && segments[0] !== '(auth)') {
    router.replace('/(client)')
  }
}
```

- [ ] **Step 3 : Commit**

```bash
git add app/(auth)/onboarding.tsx app/_layout.tsx
git commit -m "feat: add client onboarding multi-step form"
```

---

## Résultat de la Phase 1

À la fin de cette phase, l'app :
- Se lance sur iOS et Android
- Affiche un écran de login fonctionnel (Supabase auth)
- Redirige vers la bonne interface selon le rôle (coach / client / admin)
- A un schéma DB complet avec RLS en place
- A un formulaire d'onboarding pour les nouveaux clients
- A une navigation par tabs pour coach et client (écrans placeholder)

**Prochaine phase :** [Phase 2 — Coach : gestion clients + invitations](2026-04-02-phase-2-coach-clients.md)
