# Johnny App — Design Spec
_Date : 2026-04-02_

---

## Vue d'ensemble

Plateforme mobile (iOS + Android) pour coaches sportifs et leurs clients. L'IA booste le workflow du coach (génération de programmes d'entraînement) et enrichit l'expérience client (suivi nutrition + entraînement connectés).

**Objectif V1** : app complète et vendable, distribuée sur l'App Store et Google Play, vendue en B2B direct (comptes activés manuellement par l'admin).

---

## Utilisateurs

### 3 rôles
- **Admin** (Johnny) — active/désactive les comptes coaches, gestion de la plateforme
- **Coach** — gère ses clients, génère et approuve les programmes, suit la progression
- **Client** — suit son programme, logue ses séances, track sa nutrition

### Accès
- L'app est téléchargeable librement mais bloquée derrière un login
- Un coach s'inscrit → son compte est en statut **"en attente"** jusqu'à activation manuelle par l'admin
- Un client ne peut pas s'inscrire seul → il reçoit une invitation (lien ou credentials) générée par son coach, et est automatiquement rattaché à ce coach

---

## Architecture

Une seule app mobile, un seul codebase, deux espaces distincts selon le rôle détecté au login.

```
App
├── Auth (login / onboarding)
├── CoachSpace
│   ├── Dashboard global
│   ├── Vue individuelle client
│   └── Génération de programme IA
└── ClientSpace
    ├── Programme d'entraînement
    ├── Logger une séance
    └── Tracker nutritionnel
```

Pas de messagerie in-app — la communication coach/client reste externe (WhatsApp, appel, etc.).

---

## Flux principal

```
1. Coach s'inscrit → compte en attente
2. Admin active le compte coach
3. Coach crée un client → génère un lien/credentials d'invitation
4. Client reçoit l'invitation → ouvre l'app → remplit le formulaire d'onboarding
5. Coach est notifié → consulte le profil → ajoute des notes → déclenche la génération IA
6. IA génère le programme → coach review (peut éditer) → approuve
7. Client est notifié → reçoit son programme
8. Client logue ses séances + track sa nutrition au quotidien
9. Coach suit tout depuis son dashboard (séances, nutrition, check-ins, PRs)
```

---

## CoachSpace

### Dashboard global
- Liste de tous ses clients avec pour chacun :
  - Compliance séances de la semaine (ex. 3/5 faites)
  - Calories moyennes vs objectif
  - Date du dernier log
- Alertes visuelles : client inactif depuis X jours, client hors objectif calorique

### Vue individuelle client
- **Onglet Entraînement** : programme en cours, séances faites, poids soulevés dans le temps (graphiques), PRs
- **Onglet Nutrition** : calories + macros jour par jour (graphiques), historique semaine
- **Onglet Check-ins** : résumé hebdomadaire énergie / récupération / moral
- **Profil client** : infos d'onboarding complètes
- **Bouton "Nouveau programme"** → ouvre l'écran de génération IA

### Génération de programme IA
- Le coach voit le profil complet du client
- Il peut ajouter des instructions libres en texte (ex. "focus jambes ce mois", "éviter squats lourds")
- L'IA génère le programme
- Le coach voit le résultat, peut l'éditer manuellement exercice par exercice
- Il approuve → programme envoyé au client (notification push)

### Gestion clients
- Créer un client (nom, email) → génère un lien d'invitation ou des credentials
- Liste des clients avec statut (actif, en attente d'onboarding, programme en attente d'approbation)

---

## ClientSpace

### Onboarding (première connexion)
Formulaire en étapes :
1. Objectif principal (prise de masse / perte de poids / performance / santé)
2. Niveau (débutant / intermédiaire / avancé)
3. Blessures ou contre-indications (texte libre)
4. Matériel disponible (salle complète / home gym / aucun)
5. Fréquence d'entraînement souhaitée (jours/semaine)
6. Mensurations de base (poids, taille, âge)

Une fois soumis → le coach est notifié.

### Programme d'entraînement
- **Vue semaine** : séances planifiées sur 7 jours
- **Vue séance** : liste des exercices avec séries cibles, reps cibles, charge cible
- **Logger une séance** : pour chaque exercice → poids réel, reps faites, RPE (1-10)
- Séance marquée "terminée" une fois loggée
- Historique des séances passées consultable
- **PRs automatiques** : l'app détecte un nouveau record personnel et l'affiche (ex. "Nouveau PR : Squat 100kg 🎯")

### Tracker nutritionnel
- Journal du jour organisé en repas (petit-déj, déjeuner, dîner, snacks)
- Pour ajouter un aliment :
  - **Scanner code-barres** → récupère les infos via Open Food Facts API (gratuite, vaste base de données)
  - **Recherche texte** → dans la même base de données pour les aliments non emballés (fruits, viande, etc.)
- Possibilité de créer des **repas types sauvegardables** (ex. "Mon shake post-training")
- Résumé journalier : calories totales vs objectif, répartition protéines / glucides / lipides
- Historique semaine consultable

### Check-in hebdomadaire
- Chaque semaine, l'app invite le client à répondre à 3 questions (1-5) :
  1. Niveau d'énergie cette semaine
  2. Qualité de la récupération
  3. Moral général
- Le coach voit ces données dans la vue client
- Permet au coach d'ajuster le programme sans avoir à contacter le client

---

## Admin

- Liste de tous les coaches (actif / en attente)
- Activer / désactiver un compte coach
- Vue globale simplifiée (nombre de coaches, nombre de clients total)

---

## Notifications push

| Déclencheur | Destinataire |
|-------------|-------------|
| Client complète l'onboarding | Coach |
| Programme approuvé par le coach | Client |
| Nouveau check-in soumis | Coach |
| Client inactif depuis 3 jours | Coach |
| Nouveau PR détecté | Client |
| Rappel check-in hebdomadaire (si pas fait) | Client |

---

## Ce qui est hors scope V1

- Messagerie in-app
- Système de paiement in-app (Stripe, App Store subscriptions)
- Suivi du sommeil / hydratation
- Gamification / badges
- Reconnaissance d'image alimentaire par IA
- Multi-coach par client
- Export PDF des programmes

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

## Questions ouvertes

- Limites du plan coach (nombre max de clients par coach ?) → à décider avant V2
- Structure exacte du schéma Supabase → à définir au moment de l'implémentation
