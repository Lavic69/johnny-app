# Prochaine session — Johnny App

> Ce fichier est le brief de démarrage pour la prochaine session de travail.
> L'app est **entièrement développée et sécurisée**. L'objectif de la prochaine session est de **soumettre l'app sur l'App Store et Google Play**.

---

## Contexte rapide

- App mobile coaching sportif (coaches + clients), Expo + React Native + Supabase
- Développement complet : phases 1–7 ✅
- Audit sécurité Trail of Bits complet : 0 finding ouvert ✅
- Branche active : `securite-app`
- Supabase project ID : `wawkkwdlcskyzhdqviha`

Pour le détail complet du projet : [CLAUDE.md](CLAUDE.md)  
Pour le détail sécurité : [SECURITY_AUDIT.md](SECURITY_AUDIT.md)

---

## Ce qu'il reste à faire — dans l'ordre

### Étape 1 — Déployer la politique de confidentialité

**Fichier prêt :** `docs/privacy-policy.html`

À déployer sur le site Vercel du projet (`johnny-site.vercel.app`) à la route `/privacy`.
L'URL finale sera : `https://johnny-site.vercel.app/privacy`

Avant de déployer, remplacer `contact@johnny-app.fr` par le vrai email de contact de Johnny.

---

### Étape 2 — Compléter `eas.json` avec les identifiants Apple

Ouvrir `eas.json` et renseigner dans le profil `production` :

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "APPLE_ID_DE_JOHNNY@email.com",
      "ascAppId": "IDENTIFIANT_APP_STORE_CONNECT",
      "appleTeamId": "TEAM_ID_APPLE_DEVELOPER"
    }
  }
}
```

Ces infos se trouvent dans :
- **Apple ID** : compte Apple Developer de Johnny
- **ascAppId** : App Store Connect → Mon app → Informations de l'app → Apple ID
- **appleTeamId** : developer.apple.com → Account → Membership → Team ID

---

### Étape 3 — Renseigner l'URL Privacy Policy dans les stores

**App Store Connect :**  
Aller dans App Store Connect → sélectionner l'app → Informations de l'app → champ "Privacy Policy URL"  
→ coller `https://johnny-site.vercel.app/privacy`

**Google Play Console :**  
Aller dans Play Console → sélectionner l'app → Politique de confidentialité  
→ coller `https://johnny-site.vercel.app/privacy`

---

### Étape 4 — Test end-to-end sur device physique

Avant de builder, tester sur un vrai device (pas simulateur) les flux critiques :

**Flux coach :**
- [ ] Inscription coach → écran "Compte en attente" bien affiché
- [ ] Admin active le coach → accès immédiat sans reconnexion
- [ ] Créer un client (code d'invitation généré)
- [ ] Générer un programme IA pour un client (consentement IA → génération → approbation)
- [ ] Voir les logs de séances et la nutrition d'un client
- [ ] Supprimer un client (double confirmation)
- [ ] Supprimer son compte (double confirmation)

**Flux client :**
- [ ] Première connexion avec code d'invitation
- [ ] Onboarding (formulaire profil)
- [ ] Voir son programme approuvé
- [ ] Logger une séance (sets, poids, RPE) — vérifier que la séance s'affiche en "fait" après
- [ ] Modifier une séance déjà loguée
- [ ] Scanner un code-barres alimentaire
- [ ] Rechercher un aliment par texte
- [ ] Analyse IA d'un repas (texte + photo) — après consentement
- [ ] Check-in hebdomadaire
- [ ] Révoquer/réactiver le consentement IA depuis le compte
- [ ] Supprimer son compte

**Flux admin :**
- [ ] Désactiver un coach → le coach et ses clients sont immédiatement bloqués
- [ ] Réactiver le coach → accès restauré sans reconnexion

---

### Étape 5 — Build production

```bash
# Vérifier qu'on est bien logged dans EAS
eas whoami

# Build iOS + Android en production
eas build --platform all --profile production
```

Si c'est le premier build, EAS demandera de configurer les certificats — suivre le wizard interactif.

---

### Étape 6 — Soumission aux stores

```bash
# Soumettre iOS (App Store)
eas submit --platform ios --profile production

# Soumettre Android (Google Play)
eas submit --platform android --profile production
```

**Pour iOS :** l'app passe en review Apple (délai habituel 24–48h).  
**Pour Android :** la première soumission nécessite une validation manuelle (peut prendre jusqu'à 7 jours).

---

## Points d'attention avant soumission

| Item | Statut | Note |
|------|--------|------|
| Privacy Policy URL | 🔲 | Étapes 1 + 3 ci-dessus |
| `appleId` / `ascAppId` / `appleTeamId` dans `eas.json` | 🔲 | Étape 2 ci-dessus |
| Test end-to-end device | 🔲 | Étape 4 ci-dessus |
| Email contact dans privacy-policy.html | 🔲 | Avant déploiement Vercel |
| Toutes les features développées | ✅ | Phases 1–7 complètes |
| Sécurité auditée (Trail of Bits) | ✅ | 0 finding ouvert |
| Suppression de compte in-app | ✅ | Apple obligatoire |
| Consentement IA OpenAI | ✅ | Apple Guideline 5.1.2(i) |
| Privacy Manifest iOS | ✅ | `app.json` |
| Permissions camera / photos | ✅ | `app.json` |
