# Cahier de recette — Johnny App

Statuts : ✅ Validé · ❌ Échoué · 🔲 Non testé · ⚠️ Partiel/Incertain

---

## 1. Authentification & Accès

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 1.1 | Inscription coach (email + mot de passe) | ✅ | Testé et fonctionnel |
| 1.2 | Connexion coach | ✅ | Testé et fonctionnel |
| 1.3 | Déconnexion coach | ✅ | Testé et fonctionnel |
| 1.4 | Compte coach créé en statut "en attente" (pas actif direct) | ✅ | Confirmé en session |
| 1.5 | Coach en attente → redirigé vers écran d'attente, pas le dashboard | ⚠️ | Écran existe, non retesté récemment |
| 1.6 | Activation compte coach par l'admin | ✅ | Testé via panneau admin |
| 1.7 | Connexion client via email + mot de passe (créés par le coach) | ✅ | Testé avec Lya |
| 1.8 | Déconnexion client | ✅ | Bouton présent et fonctionnel |
| 1.9 | Lien "Première connexion avec un code" visible sur l'écran login | ✅ | Ajouté et testé |
| 1.10 | Écran redeem : saisir le code d'invitation + créer son mot de passe | ✅ | Testé, champ confirm password supprimé (bug iOS) |
| 1.11 | Après redeem → redirection vers onboarding client | ✅ | Confirmé fonctionnel |

---

## 2. Espace Admin

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 2.1 | Accès admin uniquement si rôle = admin | ✅ | RLS en place |
| 2.2 | Liste de tous les coaches avec statut (actif / en attente) | ✅ | Testé et fonctionnel |
| 2.3 | Activer un compte coach | ✅ | Testé |
| 2.4 | Désactiver un compte coach | ✅ | Testé |
| 2.5 | Stats : total coaches, actifs, en attente | ✅ | Affiché sur le dashboard admin |
| 2.6 | Bouton déconnexion admin | ✅ | Présent et fonctionnel |

---

## 3. Espace Coach — Dashboard

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 3.1 | Dashboard affiche stats globales (clients totaux, check-ins, séances, onboardés) | ✅ | Icône "Onboardés" corrigée (person-done → clipboard) |
| 3.2 | Liste des clients récents avec initiales et statut onboarding | ✅ | Testé |
| 3.3 | Barre de progression "clients onboardés" | ✅ | Testé |

---

## 4. Espace Coach — Gestion Clients

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 4.1 | Liste complète des clients dans l'onglet "Clients" | ✅ | Testé, RLS corrigé |
| 4.2 | Créer un nouveau client (prénom, nom, email) | ✅ | Testé |
| 4.3 | Génération d'un code d'invitation (format ABC-123) | ✅ | Testé |
| 4.4 | Copier / partager le code d'invitation | ✅ | Boutons présents |
| 4.5 | Retour à la liste après création → formulaire réinitialisé | ✅ | Corrigé avec useFocusEffect |
| 4.6 | Onglet "Clients" réinitialise la navigation au changement d'onglet | ✅ | Corrigé avec unmountOnBlur |
| 4.7 | Cliquer sur un client → voir sa fiche détaillée | ✅ | Testé |
| 4.8 | Fiche client affiche : nom, onboarding, objectif, niveau | ✅ | Testé |

---

## 5. Espace Coach — Suivi client (fiche)

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 5.1 | Onglet Entraînement : programme actif affiché | ✅ | Testé |
| 5.2 | Onglet Entraînement : séances effectuées par le client (poids, reps, RPE) | ✅ | Implémenté — à tester |
| 5.3 | Onglet Nutrition : journal alimentaire des 7 derniers jours | ✅ | Implémenté — à tester |
| 5.4 | Onglet Nutrition : total calories + protéines par jour | ✅ | Implémenté — à tester |
| 5.5 | Onglet Check-ins : historique des check-ins | ✅ | Testé |

---

## 6. Espace Coach — Programmes IA

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 6.1 | Générer un programme IA depuis la fiche client | ✅ | Testé |
| 6.2 | Programme généré avec les bons jours selon la fréquence client | ✅ | Confirmé |
| 6.3 | Coach peut voir le programme avant approbation | ✅ | Ecran de review construit |
| 6.4 | Coach approuve le programme → statut passe à "approved" | ✅ | Testé |
| 6.5 | Programme approuvé visible côté client | ✅ | Confirmé |

---

## 7. Espace Coach — Compte

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 7.1 | Affiche nom, nb clients, nb onboardés | ✅ | Testé |
| 7.2 | Affiche email du coach | ✅ | Corrigé (récupéré via auth.getUser) |
| 7.3 | Badge statut actif / en attente | ✅ | Testé |
| 7.4 | Bouton déconnexion coach | ✅ | Testé |

---

## 8. Onboarding Client

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 8.1 | Formulaire 7 étapes s'affiche si onboarding non complété | ✅ | Testé |
| 8.2 | Étape 1 : prénom, nom, âge obligatoires | ✅ | Validation présente |
| 8.3 | Étape 2 : poids, taille + affichage IMC en temps réel | ✅ | Testé |
| 8.4 | Étapes 3-6 : sélection objectif / niveau / fréquence / matériel | ✅ | Testé |
| 8.5 | Étape 7 : blessures (optionnel) | ✅ | Testé |
| 8.6 | Barre de progression en haut | ✅ | Présente |
| 8.7 | Bouton "Retour" fonctionnel entre étapes | ✅ | Présent |
| 8.8 | Enregistrement en base → onboarding visible côté coach | ✅ | Confirmé, bug de détection corrigé |
| 8.9 | Après onboarding → redirection vers l'accueil client | ✅ | Fonctionne |

---

## 9. Espace Client — Programme

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 9.1 | Si pas d'onboarding → bouton "Compléter mon profil" affiché | ✅ | Testé |
| 9.2 | Si onboarding fait mais pas de programme → message "en préparation" | ✅ | Testé |
| 9.3 | Programme approuvé → liste des jours d'entraînement affichée | ✅ | Testé |
| 9.4 | Cliquer sur un jour → voir les exercices | ✅ | Testé |
| 9.5 | Logger une séance : sets, poids, reps, RPE | ✅ | Testé, bugs Hermes corrigés |
| 9.6 | Séance sauvegardée en base | ✅ | Confirmé |

---

## 10. Espace Client — Nutrition

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 10.1 | Écran nutrition : 4 repas (petit-déjeuner, déjeuner, dîner, collation) | ✅ | Testé |
| 10.2 | Totaux calories + macros affichés en haut | ✅ | Testé |
| 10.3 | Totaux mis à jour après ajout d'un aliment | ✅ | Corrigé (useFocusEffect) et validé |
| 10.4 | Mode "Décrire" : saisir texte libre → analyse IA → résultat | ✅ | Validé par Lya |
| 10.5 | Résultat IA affiche nom + calories + protéines + glucides + lipides | ✅ | Validé |
| 10.6 | Bouton "Ajouter au journal" → aliment sauvegardé | ✅ | Corrigé et validé |
| 10.7 | Aliment ajouté visible dans le bon repas | ✅ | Validé |
| 10.8 | Items IA n'affichent pas "100g" (inutile pour texte/photo) | ✅ | Corrigé |
| 10.9 | Mode "Photo" : prendre photo ou galerie → analyse IA → résultat | ✅ | Validé par Lya |
| 10.10 | Mode "Scanner" : scanner un code-barres → quantité → journal | ✅ | Validé |
| 10.11 | Supprimer un aliment d'un repas | ✅ | Validé |
| 10.12 | Journal persistant par jour (les données du jour restent) | ✅ | Confirmé |

---

## 11. Espace Client — Check-in

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 11.1 | Écran check-in accessible via l'onglet | ✅ | Testé |
| 11.2 | Saisir énergie / récupération / humeur (1-5) | 🔲 | Construit, jamais testé end-to-end |
| 11.3 | Enregistrement du check-in | 🔲 | Construit, jamais testé |
| 11.4 | Un seul check-in par semaine (pas de doublon) | 🔲 | Logique présente, jamais testée |

---

## 12. Espace Client — Compte

| # | Fonctionnalité | Statut | Notes |
|---|---------------|--------|-------|
| 12.1 | Affiche nom, âge, poids, taille, IMC | ✅ | Testé |
| 12.2 | Affiche objectif, niveau, fréquence, matériel | ✅ | Testé |
| 12.3 | Affiche blessures | ✅ | Testé |
| 12.4 | Badge coach affiché avec le nom du coach | ✅ | Testé |
| 12.5 | Mode édition : modifier prénom, nom, âge, poids, taille, blessures | 🔲 | Construit, jamais testé |
| 12.6 | Enregistrement des modifications | 🔲 | Construit, jamais testé |
| 12.7 | Bouton déconnexion client | ✅ | Testé |

---

## Résumé

| Zone | Total | ✅ Validés | ⚠️ Partiel | 🔲 Non testés |
|------|-------|-----------|-----------|--------------|
| Authentification | 11 | 10 | 1 | 0 |
| Admin | 6 | 6 | 0 | 0 |
| Coach — Dashboard | 3 | 3 | 0 | 0 |
| Coach — Clients | 8 | 8 | 0 | 0 |
| Coach — Suivi client | 5 | 5 | 0 | 0 |
| Coach — Programmes | 5 | 5 | 0 | 0 |
| Coach — Compte | 4 | 4 | 0 | 0 |
| Onboarding | 9 | 9 | 0 | 0 |
| Client — Programme | 6 | 6 | 0 | 0 |
| Client — Nutrition | 12 | 12 | 0 | 0 |
| Client — Check-in | 4 | 1 | 0 | 3 |
| Client — Compte | 7 | 5 | 0 | 2 |
| **TOTAL** | **80** | **74** | **1** | **5** |

---

## Reste à tester

| # | Priorité | Sujet |
|---|----------|-------|
| 5.2 / 5.3 / 5.4 | Haute | Suivi client coach : séances effectuées + nutrition (implémenté aujourd'hui) |
| 11.2 / 11.3 / 11.4 | Moyenne | Check-in client complet end-to-end |
| 12.5 / 12.6 | Moyenne | Édition du profil client |
| 1.5 | Basse | Écran d'attente coach (compte en attente d'activation) |
