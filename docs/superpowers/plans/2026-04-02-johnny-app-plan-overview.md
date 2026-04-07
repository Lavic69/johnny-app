# Johnny App — Plan d'implémentation (Vue d'ensemble)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une app mobile iOS + Android pour coaches sportifs et leurs clients, avec génération IA de programmes, suivi nutrition et entraînement.

**Architecture:** Expo (React Native) + TypeScript côté mobile, Supabase (PostgreSQL + Auth + Realtime) côté backend, GPT-4o mini pour la génération de programmes. Deux interfaces distinctes selon le rôle (coach / client), déterminé au login.

**Tech Stack:** Expo SDK 52+, Expo Router v3, Supabase JS v2, OpenAI SDK, Open Food Facts API, EAS Build

---

## Phases

| Phase | Contenu | Statut | Plan détaillé |
|-------|---------|--------|---------------|
| 1 | Foundation — Setup, DB schema, Auth, Navigation | ✅ | [phase-1-foundation.md](2026-04-02-phase-1-foundation.md) |
| 2 | Coach — Gestion clients + invitations | ✅ | [phase-2-coach-clients.md](2026-04-02-phase-2-coach-clients.md) |
| 3 | Coach — Génération IA de programmes | ✅ | [phase-3-ai-programs.md](2026-04-02-phase-3-ai-programs.md) |
| 4 | Client — Programme + Logger séances + PRs | ✅ | [phase-4-client-training.md](2026-04-02-phase-4-client-training.md) |
| 5 | Client — Tracker nutritionnel (barcode + recherche) | ✅ | [phase-5-nutrition.md](2026-04-02-phase-5-nutrition.md) |
| 6 | Check-ins hebdo + Notifications push | ✅ | [phase-6-checkins-notifs.md](2026-04-02-phase-6-checkins-notifs.md) |
| 7 | Admin — Activation comptes coaches | ✅ | [phase-7-admin.md](2026-04-02-phase-7-admin.md) |
| 8 | Sécurité (audit Trail of Bits × 2) + Compliance store | ✅ | [SECURITY_AUDIT.md](../../SECURITY_AUDIT.md) |

**Statut global : développement complet. En attente de soumission store.**

### Checklist soumission store

- [ ] Test end-to-end sur device physique (iOS + Android)
- [ ] Déployer `docs/privacy-policy.html` → `johnny-site.vercel.app/privacy`
- [ ] Renseigner URL Privacy Policy dans App Store Connect + Play Console
- [ ] Renseigner `appleId` / `ascAppId` / `appleTeamId` dans `eas.json`
- [ ] `eas build --platform all --profile production`
- [ ] `eas submit --platform all`

---

## Schéma base de données (Supabase / PostgreSQL)

```sql
-- Profiles (extension de auth.users)
profiles (id uuid PK → auth.users, role text CHECK(coach|client|admin), full_name text, created_at)

-- Coaches
coaches (id uuid PK, profile_id uuid → profiles, status text CHECK(active|pending), created_at)

-- Invite tokens
invite_tokens (id uuid PK, coach_id uuid → coaches, token text UNIQUE, email text, used bool, expires_at timestamptz)

-- Clients
clients (id uuid PK, profile_id uuid → profiles, coach_id uuid → coaches, onboarding jsonb, nutrition_goal jsonb, created_at)

-- Programmes
programs (id uuid PK, client_id uuid → clients, coach_id uuid → coaches, status text CHECK(draft|approved), exercises jsonb, coach_notes text, ai_prompt text, created_at, approved_at)

-- Séances (dans un programme)
sessions (id uuid PK, program_id uuid → programs, client_id uuid → clients, day_label text, order_index int)

-- Logs de séances
session_logs (id uuid PK, session_id uuid → sessions, client_id uuid → clients, logged_at timestamptz, sets jsonb [{exercise, weight, reps, rpe}], completed bool)

-- Personal Records
personal_records (id uuid PK, client_id uuid → clients, exercise_name text, weight numeric, reps int, achieved_at timestamptz)

-- Journal alimentaire
food_logs (id uuid PK, client_id uuid → clients, logged_date date, meal_type text CHECK(breakfast|lunch|dinner|snack), foods jsonb [{name, barcode, calories, protein, carbs, fat, quantity_g}], created_at)

-- Repas sauvegardés
saved_meals (id uuid PK, client_id uuid → clients, name text, foods jsonb)

-- Check-ins hebdomadaires
weekly_checkins (id uuid PK, client_id uuid → clients, week_start date, energy int CHECK(1-5), recovery int CHECK(1-5), mood int CHECK(1-5), created_at)
```

---

## Structure de fichiers cible

```
/
├── app/
│   ├── _layout.tsx                  # Root layout + auth gate
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── onboarding.tsx           # Client onboarding form
│   ├── (coach)/
│   │   ├── _layout.tsx              # Coach tab navigator
│   │   ├── index.tsx                # Dashboard global
│   │   ├── clients/
│   │   │   ├── index.tsx            # Liste clients
│   │   │   ├── new.tsx              # Créer client + invitation
│   │   │   └── [id]/
│   │   │       ├── index.tsx        # Vue client (tabs)
│   │   │       ├── training.tsx     # Onglet entraînement
│   │   │       ├── nutrition.tsx    # Onglet nutrition
│   │   │       └── checkins.tsx     # Onglet check-ins
│   │   └── programs/
│   │       └── generate.tsx         # Génération IA
│   ├── (client)/
│   │   ├── _layout.tsx              # Client tab navigator
│   │   ├── index.tsx                # Programme du jour
│   │   ├── session/
│   │   │   └── [id].tsx            # Logger une séance
│   │   ├── nutrition/
│   │   │   ├── index.tsx           # Journal alimentaire
│   │   │   └── scan.tsx            # Scanner barcode
│   │   └── checkin.tsx             # Check-in hebdo
│   └── (admin)/
│       ├── _layout.tsx
│       └── index.tsx               # Liste coaches + activation
├── components/
│   ├── coach/
│   │   ├── ClientCard.tsx
│   │   ├── ProgramEditor.tsx
│   │   └── StatsWidget.tsx
│   ├── client/
│   │   ├── ExerciseLogger.tsx
│   │   ├── FoodEntry.tsx
│   │   └── MacroRing.tsx
│   └── shared/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Avatar.tsx
├── lib/
│   ├── supabase.ts                  # Client Supabase + types
│   ├── openai.ts                    # Client OpenAI + prompt builder
│   └── openfoodfacts.ts             # Wrapper Open Food Facts API
├── hooks/
│   ├── useAuth.ts
│   ├── useClients.ts
│   ├── useProgram.ts
│   └── useNutrition.ts
├── types/
│   └── index.ts                     # Types globaux (Profile, Client, Program...)
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```
