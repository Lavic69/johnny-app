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

## File Structure

> _À remplir une fois le projet scaffoldé._

---

## Key Conventions

> _À remplir au fur et à mesure._

---

## External References

> _Liens Figma, Notion, ou autres outils à ajouter._

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
