# Johnny App — CLAUDE.md

This file is the persistent source of truth for this project. Update it as the project evolves.

---

## Project Overview

App mobile pour **coaches sportifs et leurs clients**. L'IA booste le workflow du coach (génération de programmes) et enrichit l'expérience client (suivi nutrition + entraînement).

**Cible** : V1 complète et vendable, distribuée sur l'App Store et Google Play.

**Deux types d'utilisateurs** :
- **Coach** — gère ses clients, génère et approuve les programmes IA, suit la progression et la nutrition de ses clients
- **Client** — reçoit son programme, logue ses séances (poids, RPE, sets), track sa nutrition

**Pas de messagerie dans l'app** — la communication coach/client reste externe (WhatsApp, etc.).

---

## Architecture

- **Une seule app mobile** (iOS + Android), un seul codebase, un seul téléchargement
- Le rôle (coach ou client) est déterminé à la création du compte
- **Coach** : peut s'inscrire librement
- **Client** : accès uniquement via invitation/credentials générés par le coach

**Flux principal** :
```
Coach crée un client
  → Client reçoit invite → remplit son profil (formulaire onboarding)
  → Coach voit le profil → déclenche génération IA du programme
  → IA génère → coach review & approuve
  → Client reçoit son programme
  → Client logue ses séances + sa nutrition
  → Coach suit tout depuis son dashboard
```

**Deux grandes zones** :
- `CoachSpace` — dashboard, gestion clients, génération programmes
- `ClientSpace` — programme, logger séance, tracker nutrition

---

## Fonctionnalités core

### CoachSpace
- Dashboard global : tous les clients, stats de compliance, nutrition hebdo
- Vue individuelle par client : historique séances, progression, nutrition
- Génération de programme via IA (basé sur le profil client)
- Review & approbation du programme avant envoi au client
- Création/invitation des clients (credentials ou lien d'invite)

### ClientSpace
- Formulaire d'onboarding : objectifs, niveau, blessures, matériel dispo
- Consultation du programme d'entraînement
- Logger les séances : exercices faits, poids soulevés, RPE, sets
- Tracker nutritionnel : scanner code-barres (Open Food Facts) + recherche texte
- Création de repas composés sauvegardables
- Calcul automatique calories + macros

### IA
- Génère le programme d'entraînement à partir du profil client
- Nutrition + entraînement sont connectés (le coach voit les deux)

---

## Design System

Reference site : **[johnny-site.vercel.app](https://johnny-site.vercel.app)**
Full tokens documented in [design/system.md](design/system.md).

- **Fonts** : Inter (body/UI) + Outfit (display/headings), both variable
- **Primary color** : `#e11d48` (rose-red)
- **Dark color** : `#1e293b` (charcoal)
- **Neutral** : Slate scale (`#f8fafc` → `#1d293d`)
- **Accents** : Emerald (`#00bb7f`), Blue (`#3080ff`), Orange (`#ff8b1a`)
- **Radius** : `rounded-xl` (0.75rem) to `rounded-[3rem]` (48px), `rounded-full` pour pills
- **Glass effect** : `backdrop-blur` + semi-transparent bg (`#1e293b66`)
- **Orbs** : `blur-[150px]` decorative blobs in brand/emerald
- **Marquee animation** : 15s linear infinite horizontal scroll

---

## Tech Stack

| Couche | Choix |
|--------|-------|
| Mobile | Expo (React Native) + TypeScript |
| Backend | Supabase (PostgreSQL + Auth + Realtime) |
| IA | GPT-4o mini (OpenAI) |
| Nutrition DB | Open Food Facts API (gratuite) |
| Notifications | Expo Notifications + FCM |
| Stores | EAS Build (App Store + Google Play) |

---

## Statut du projet

> Dernière mise à jour : 2026-04-07

### ✅ Développement — COMPLET (phases 1–7)

| Phase | Contenu | Statut |
|-------|---------|--------|
| 1 | Foundation — Setup, DB schema, Auth, Navigation | ✅ |
| 2 | Coach — Gestion clients + invitations | ✅ |
| 3 | Coach — Génération IA de programmes (Edge Function proxy) | ✅ |
| 4 | Client — Programme + Logger séances + PRs | ✅ |
| 5 | Client — Tracker nutritionnel (barcode + recherche + analyse IA) | ✅ |
| 6 | Check-ins hebdo + Notifications push | ✅ |
| 7 | Admin — Activation comptes coaches (Realtime ejection) | ✅ |

### ✅ Sécurité — COMPLET (2 sprints d'audit Trail of Bits)

Voir [SECURITY_AUDIT.md](SECURITY_AUDIT.md) pour le détail complet.

| Item | Statut |
|------|--------|
| Clé OpenAI hors bundle (Edge Function proxy) | ✅ |
| Privilege escalation signup (trigger role hardcodé) | ✅ |
| RLS complet sur toutes les tables (28 policies) | ✅ |
| Codes d'invitation CSPRNG (`crypto.getRandomValues`) | ✅ |
| Blocage coach désactivé en temps réel (Realtime) | ✅ |
| Récursion RLS infinie cassée (security definer function) | ✅ |
| Suppression de compte in-app (Edge Function `delete-account`) | ✅ |
| Suppression de client par le coach (Edge Function `delete-client`) | ✅ |
| Consentement IA OpenAI (Apple Guideline 5.1.2(i)) | ✅ |
| Privacy Manifest iOS (`NSPrivacyAccessedAPITypes`) | ✅ |
| `clients` INSERT validé contre `invite_tokens` (coach_id safe) | ✅ |
| Push token dans colonne dédiée (plus dans `avatar_url`) | ✅ |
| `EXPO_PUBLIC_OPENAI_API_KEY` retiré de `.env.local` | ✅ |

### 🔲 Avant soumission store — RESTANT

| # | Action | Responsable |
|---|--------|-------------|
| 1 | **Test end-to-end sur device physique** (iOS + Android) — vérifier tous les flux | Dev |
| 2 | **Déployer `privacy-policy.html`** sur Vercel (`johnny-site.vercel.app/privacy`) | Dev |
| 3 | **Renseigner l'URL Privacy Policy** dans App Store Connect + Play Console | Dev |
| 4 | **Renseigner `appleId`, `ascAppId`, `appleTeamId`** dans `eas.json` | Dev |
| 5 | **`eas build --platform all`** — build production iOS + Android | Dev |
| 6 | **`eas submit`** — soumettre aux stores | Dev |

---

## File Structure

```
app/
  _layout.tsx                   # Root layout + auth gate (rôle-based routing)
  (auth)/login.tsx              # Connexion email/password
  (auth)/redeem.tsx             # Première connexion client (code d'invitation)
  (auth)/onboarding.tsx         # Formulaire onboarding client (objectifs, niveau…)
  (coach)/_layout.tsx           # Tab bar coach + guard statut actif + Realtime
  (coach)/index.tsx             # Dashboard coach
  (coach)/clients/index.tsx     # Liste clients
  (coach)/clients/new.tsx       # Créer client + générer code d'invitation
  (coach)/clients/[id]/index.tsx # Fiche client (séances, nutrition, check-ins)
  (coach)/programs/generate.tsx  # Génération IA + review + approbation
  (coach)/account.tsx           # Compte coach + suppression + consentement IA
  (client)/_layout.tsx          # Tab bar client + guard coach actif + Realtime
  (client)/index.tsx            # Programme du jour (DayCards avec état logged)
  (client)/session/[dayOrder].tsx # Logger une séance (sets, poids, RPE)
  (client)/nutrition/index.tsx  # Journal alimentaire
  (client)/nutrition/add.tsx    # Ajouter aliment (barcode, recherche, IA)
  (client)/checkin.tsx          # Check-in hebdomadaire
  (client)/account.tsx          # Compte client + suppression + consentement IA
  (admin)/_layout.tsx           # Layout admin
  (admin)/index.tsx             # Panneau activation coaches

lib/
  supabase.ts                   # Client Supabase (AsyncStorage session)
  openai.ts                     # Proxy Edge Function (jamais de clé dans le bundle)
  openfoodfacts.ts              # Wrapper Open Food Facts API
  notifications.ts              # Push token (colonne push_token sur profiles)
  env.ts                        # ENV.supabaseUrl + ENV.supabaseAnonKey uniquement

hooks/
  useAuth.ts                    # Session + profile + role
  useCoach.ts                   # Chargement enregistrement coach par profile_id

supabase/
  functions/
    openai-proxy/index.ts       # Proxy OpenAI (auth JWT + role check + OPENAI_API_KEY secret)
    delete-account/index.ts     # Suppression compte (auth JWT → admin.deleteUser)
    delete-client/index.ts      # Suppression client par coach (ownership check → admin.deleteUser)
  migrations/
    001_initial_schema.sql      # Schéma + RLS activé + policies de base + trigger
    002_admin_policies.sql      # Policies admin
    003_security_fixes.sql      # Fix trigger role + policies manquantes (8 tables)
    005_security_sharp_edges.sql # Fix clients INSERT (coach_id via invite_tokens) + push_token column

docs/
  privacy-policy.html           # Page politique de confidentialité (à déployer sur Vercel)
  superpowers/plans/            # Plans d'implémentation par phase
```

---

## Key Conventions

- **Rôles :** `coach`, `client`, `admin` — hardcodé à `client` à l'inscription, promu manuellement
- **Auth guard :** chaque `_layout.tsx` de zone vérifie le statut (actif/bloqué) avant de rendre les tabs
- **OpenAI :** toujours via `lib/openai.ts` → Edge Function `openai-proxy` — jamais de clé client-side
- **Realtime :** subscriptions Supabase dans les layouts pour éjection immédiate si coach désactivé
- **Suppression :** toujours via Edge Function (service_role) — jamais depuis le client directement
- **Codes invitation :** 6 chars, alphabet 32 (pas O/0/I/1), `crypto.getRandomValues()`, expiry 7j
- **Migrations :** numérotées `001_`, `002_`… — ne jamais modifier une migration existante appliquée

---

## External References

- **Site de référence design :** [johnny-site.vercel.app](https://johnny-site.vercel.app)
- **Supabase project :** `wawkkwdlcskyzhdqviha` (URL dans `.env.local`)
- **Audit sécurité complet :** [SECURITY_AUDIT.md](SECURITY_AUDIT.md)

---

## Business Model

- **Abonnement coach** — le coach paye, l'accès client est inclus
- **V1 : paiement manuel externe** — pas de Stripe ni d'in-app purchase. Les coaches contactent Johnny directement, paient hors app, et Johnny active manuellement leur compte
- Les comptes coach ont un statut **actif / en attente** — un coach ne peut pas s'activer seul
- Panneau admin simple pour activer/désactiver les comptes coaches

---

## Notes & Decisions

| Date       | Decision | Rationale |
|------------|----------|-----------|
| 2026-04-02 | Créé CLAUDE.md | Suivi du projet entre sessions |
| 2026-04-02 | App mobile uniquement (iOS + Android) | Plus simple pour le dev, scanner barcode natif |
| 2026-04-02 | Une seule app, rôle-based (Option A) | Un codebase, une release, plus facile à itérer |
| 2026-04-02 | Pas de messagerie in-app | Laisse liberté au coach, évite complexité inutile |
| 2026-04-02 | Scanner alimentaire = barcode + recherche texte (Option C) | Précision > approximation IA photo |
| 2026-04-02 | Accès client via invitation coach uniquement | Contrôle de la relation coach/client |
| 2026-04-02 | Pas de paiement in-app en V1 | B2B direct avec connaissances, paiement géré manuellement par Johnny |
| 2026-04-02 | Compte coach = actif/en attente | Johnny active manuellement après paiement externe |
| 2026-04-04 | OpenAI via Edge Function proxy uniquement | Clé jamais dans le bundle — audit sécurité |
| 2026-04-04 | Suppression de compte in-app obligatoire | Apple App Store Guideline 5.1.1 |
| 2026-04-04 | Consentement IA explicite avant génération | Apple Guideline 5.1.2(i) nov. 2025 |
| 2026-04-07 | Audit sécurité Trail of Bits sprint 2 complet | 0 finding ouvert, app prête pour soumission |
| 2026-04-07 | Privacy Policy page créée (`docs/privacy-policy.html`) | Requis App Store Connect + Play Console |
