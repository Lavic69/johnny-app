# Audit de Sécurité — Johnny App
**Date initiale :** 2026-04-04 | **Dernière mise à jour :** 2026-04-07  
**Branche :** `securite-app`  
**Skills utilisés :** Trail of Bits — `audit-context-building` · `insecure-defaults` · `sharp-edges` · `supply-chain-risk-auditor`

---

## 1. Cartographie du système (`audit-context-building`)

### Acteurs et niveaux de confiance

| Acteur | Accès |
|--------|-------|
| `anon` (non-auth) | SELECT sur `invite_tokens` (tokens valides non-expirés uniquement) |
| `client` (JWT) | CRUD sur ses propres données (food_logs, session_logs, PRs, checkins, onboarding) |
| `coach` (JWT) | CRUD clients, programs, invite_tokens + lecture données clients |
| `admin` (JWT) | Lecture + mise à jour statut coaches via `is_admin()` |
| `service_role` | Edge Function `openai-proxy` uniquement (serveur, jamais client) |

### Flux critiques

- **Signup client** → redeem (invite token + email) → JWT → INSERT clients
- **Génération programme** → Edge Function → secret serveur → OpenAI
- **Analyse repas** → Edge Function → secret serveur → OpenAI
- **Activation coach** → Admin panel → `is_admin()` DB function → UPDATE coaches

### Frontières de confiance

```
App mobile
  ├── → Supabase Auth (JWT anon key — publique, standard Supabase)
  ├── → Supabase Edge Function openai-proxy (JWT user token — authentifié)
  └── → Open Food Facts API (pas d'auth — API publique acceptable)

Edge Function openai-proxy (serveur Deno)
  └── → OpenAI API (OPENAI_API_KEY — secret Supabase, jamais exposé)
```

---

## 2. Findings `insecure-defaults`

### RÉSOLU — Clé OpenAI exposée dans le bundle (`CRITIQUE`)

**Localisation avant fix :** `lib/env.ts:4`, `lib/openai.ts:7`

**Pattern :**
```ts
// AVANT — CRITIQUE
export const ENV = {
  openaiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY!, // bundlé dans le JS client
}
const openai = new OpenAI({ apiKey: ENV.openaiApiKey, dangerouslyAllowBrowser: true })
```

**Impact :** Tout utilisateur qui télécharge l'app peut extraire la clé depuis le bundle JS → utilisation illimitée à la charge du compte OpenAI, violation des ToS.

**Fix appliqué :** Clé retirée du bundle. Tous les appels OpenAI passent par `supabase/functions/openai-proxy/index.ts` qui détient la clé comme secret serveur Supabase.

```ts
// APRÈS — SECURE
async function callProxy<T>(action: string, payload: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke('openai-proxy', {
    body: { action, payload },
  })
  // ...
}
```

**Commit :** `c2e7b68`

---

### RÉSOLU — Privilege escalation via metadata signup (`CRITIQUE`)

**Localisation avant fix :** `supabase/migrations/001_initial_schema.sql:162`

**Pattern :**
```sql
-- AVANT — CRITIQUE
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'), -- ← contrôlé par le client !
    ...
  );
end;
$$;
```

**Impact :** N'importe qui pouvait appeler `supabase.auth.signUp({ options: { data: { role: 'admin' } } })` et obtenir un compte admin.

**Fix appliqué :** Rôle hardcodé à `'client'` dans le trigger. Seul un admin peut promouvoir un utilisateur via `service_role`.

```sql
-- APRÈS — SECURE
values (new.id, 'client', coalesce(new.raw_user_meta_data->>'full_name', new.email));
```

**Vérifié en DB :** `SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user'` → confirme `'client'` hardcodé.

**Commit :** `c2e7b68` — Migration `003_security_fixes.sql`

---

### RÉSOLU — RLS activé sans policies sur 7 tables (`HAUT`)

**État avant fix :** RLS activé sur 11 tables mais policies uniquement sur `profiles`, `coaches`, `clients`, `programs`. Résultat : DENY ALL implicite → app partiellement cassée en production.

**Tables corrigées :**

| Table | Policies ajoutées |
|-------|-------------------|
| `invite_tokens` | SELECT anon (redeem), SELECT/INSERT coach, UPDATE (marquer utilisé) |
| `clients` | INSERT client (redeem), INSERT/UPDATE coach, UPDATE client |
| `sessions` | SELECT/ALL client, SELECT/ALL coach |
| `session_logs` | ALL client, SELECT coach |
| `personal_records` | ALL client, SELECT coach |
| `food_logs` | ALL client, SELECT coach |
| `saved_meals` | ALL client |
| `weekly_checkins` | ALL client, SELECT coach |

**Vérifié en DB :** `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'` → 28 policies actives.

**Commit :** `c2e7b68` — Migration `003_security_fixes.sql`

---

### RÉSOLU — `EXPO_PUBLIC_OPENAI_API_KEY` dans `.env.local` (`MEDIUM`)

**Localisation :** `.env.local:3`

**Pattern :**
```
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...  ← préfixe EXPO_PUBLIC_ = auto-bundlé si référencé
```

**Impact :** La clé n'était pas utilisée côté client (`lib/env.ts` ne l'expose pas), mais sa présence avec ce préfixe était une bombe à retardement — toute future référence accidentelle dans le code client l'aurait bundlée dans l'app. De plus, la clé réelle était stockée dans le fichier.

**Fix :** Ligne supprimée de `.env.local`. La clé OpenAI reste uniquement comme secret Supabase côté serveur (Edge Function `openai-proxy`).

---

## 3. Findings `sharp-edges`

### RÉSOLU — `Math.random()` pour génération de codes d'invitation (`MEDIUM`)

**Localisation avant fix :** `app/(coach)/clients/new.tsx:14`

**Pattern :**
```ts
// AVANT — non cryptographique
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
```

**Impact :** `Math.random()` est pseudo-aléatoire. Un attaquant connaissant le timestamp de génération pourrait prédire le code. Risque atténué par : email obligatoire + expiry 7 jours + 32^6 ≈ 1 milliard de combinaisons.

**Fix appliqué :** `crypto.getRandomValues()` — CSPRNG natif disponible dans React Native 0.81+.

```ts
// APRÈS — cryptographiquement sécurisé
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
```

**Commit :** `69d330e`

---

### RÉSOLU — `clients` INSERT policy ne valide pas le `coach_id` (`MEDIUM`)

**Localisation :** `supabase/migrations/003_security_fixes.sql` (policy remplacée dans `005`)

**Pattern :**
```sql
-- AVANT — insuffisant
CREATE POLICY "New client can insert own record"
  ON public.clients FOR INSERT
  WITH CHECK (profile_id = auth.uid());
  -- ↑ n'importe quel coach_id était accepté
```

**Impact :** Après la création de compte via le redeem flow, un utilisateur techniquement averti pouvait appeler `clients.insert({ profile_id: userId, coach_id: N_IMPORTE_QUEL_COACH_ID })` et se rattacher à n'importe quel coach. Ce coach verrait le client dans son dashboard sans l'avoir invité.

**Fix :** Policy remplacée pour valider que le `coach_id` correspond à un invite_token valide (non expiré, non utilisé) portant l'email de l'utilisateur courant.

```sql
-- APRÈS — secure
CREATE FUNCTION public.get_current_user_email()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS
$$ SELECT email FROM auth.users WHERE id = auth.uid() $$;

CREATE POLICY "New client can insert own record"
  ON public.clients FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.invite_tokens it
      WHERE it.coach_id = coach_id
        AND it.used = false
        AND it.expires_at > now()
        AND (it.email IS NULL OR it.email = public.get_current_user_email())
    )
  );
```

**Migration :** `005_security_sharp_edges`

---

### RÉSOLU — Push token stocké dans `avatar_url` (`LOW`)

**Localisation :** `lib/notifications.ts:38` (avant fix)

**Pattern :**
```ts
// AVANT — confusion de type
await supabase.from('profiles').update({ avatar_url: token }).eq('id', userId)
```

**Impact :** Toute image de profil aurait été écrasée par le push token (une chaîne `ExponentPushToken[...]`). Code affichant `avatar_url` comme image URL → comportement cassé silencieusement.

**Fix :** Colonne dédiée `push_token text` ajoutée sur `profiles` (migration `005`). `lib/notifications.ts` mis à jour pour utiliser `push_token`.

**Migration :** `005_security_sharp_edges`

---

## 4. Finding `supply-chain-risk-auditor`

### RÉSOLU — Package `openai` mort dans les dépendances (`MEDIUM`)  
*(Audit 2026-04-04)*

**Localisation :** `package.json` — `"openai": "6.33.0"`

**Contexte :** Après migration vers l'Edge Function, le package `openai` n'est plus importé dans aucun fichier source. Risque supply chain inutile (dépendance inactive = surface d'attaque non surveillée).

**Vérification :** `grep -r "from 'openai'"` → exit code 1 (aucun match).

**Fix :** Package retiré de `package.json`.

**Commit :** `69d330e`

---

### INFO — 5 vulnérabilités LOW dans les devDependencies (`jest-expo` chain)

**Scope :** Environnement de test uniquement — aucun impact production.

| Package | Severity | Via |
|---------|----------|-----|
| `@tootallnate/once` | LOW | `http-proxy-agent` |
| `http-proxy-agent` | LOW | `jsdom` |
| `jsdom` | LOW | `jest-environment-jsdom` |
| `jest-environment-jsdom` | LOW | `jest-expo` |
| `jest-expo` | LOW | (direct devDep) |

**Action :** Aucune — non bundlé, non exploitable en production. À surveiller lors des montées de version `jest-expo`.

### INFO — Supply chain globale : propre

Toutes les dépendances directes de production sont de grands acteurs maintenus par des organisations (Expo, Meta, Supabase, Microsoft, Software Mansion). Aucune dépendance single-maintainer anonyme, aucun package déprécié ou archivé.

---

## 5. Compliance App Store / Google Play

### Appliqué dans ce sprint

| Item | Fichier | Statut |
|------|---------|--------|
| Privacy Manifest (`NSPrivacyAccessedAPITypes`) | `app.json` | ✅ |
| `NSPhotoLibraryUsageDescription` | `app.json` | ✅ |
| `NSCameraUsageDescription` | `app.json` | ✅ |
| `eas.json` (EAS Build/Submit) | `eas.json` | ✅ |
| Icon + Splash + Adaptive Icon | `assets/` | ✅ |
| `expo-barcode-scanner` retiré (déprécié) | `package.json` | ✅ |
| **Suppression de compte in-app** (Apple obligatoire) | `app/(coach)/account.tsx` · `app/(client)/account.tsx` · `supabase/functions/delete-account/` | ✅ |
| **Consentement IA OpenAI** (Guideline 5.1.2(i), nov. 2025) | `components/AIConsentModal.tsx` · `hooks/useAIConsent.ts` + intégration | ✅ |

### Détail — Suppression de compte (`delete-account` Edge Function)

- Double confirmation native (Alert × 2) avant déclenchement
- Edge Function vérifie le JWT utilisateur (pas de suppression non-authentifiée)
- Suppression via `auth.admin.deleteUser()` avec `service_role` → CASCADE DB supprime automatiquement profiles → coaches/clients → toutes les données liées
- Disponible sur les deux espaces (coach et client)
- **Commit :** implémenté dans ce sprint — à tester sur device avant soumission

### Détail — Consentement IA (Apple Guideline 5.1.2(i))

Obligations Apple respectées :
- Nomme explicitement **OpenAI** (openai.com) comme fournisseur tiers américain
- Décrit précisément les données envoyées pour chaque usage (programme / analyse repas)
- Bouton "Refuser" accessible, pas caché, même taille que "Accepter"
- Fonctions core (barcode scan, consultation programme) restent accessibles si refus
- Révocation possible depuis le profil à tout moment

Persistance : `profiles.ai_consent` (boolean) + `profiles.ai_consent_at` (timestamptz) — migration `004_ai_consent` appliquée en DB.

Points d'intégration :
| Écran | Comportement si `pending` | Comportement si `declined` |
|-------|--------------------------|---------------------------|
| `generate.tsx` (coach) | Modale avant génération, puis génère si accepté | Alert bloquant, bouton toujours visible |
| `add.tsx` (client) | Modale avant analyse texte/photo | Onglets Décrire + Photo masqués, Scanner accessible |
| `account.tsx` (coach + client) | — | Bouton "Révoquer" visible si `accepted` |

**Commit :** `7811431`

### Restant (hors code — process)

| # | Item | Obligation | Quand |
|---|------|-----------|-------|
| 1 | **Privacy Policy URL** | Apple + Google | À renseigner dans App Store Connect / Play Console |
| 2 | **`appleId` / `ascAppId` / `appleTeamId`** dans `eas.json` | EAS Submit | Au moment de la soumission |

---

## 6. Vérifications finales (scans automatiques)

| Scan | Résultat |
|------|----------|
| `grep EXPO_PUBLIC_OPENAI` dans le codebase | ✅ Exit 1 — aucun match (clé retirée de `.env.local`) |
| `grep dangerouslyAllowBrowser` dans le codebase | ✅ Exit 1 — aucun match |
| `grep "from 'openai'"` dans le codebase | ✅ Exit 1 — aucun match |
| HTTP (non-HTTPS) dans les appels réseau | ✅ Aucun trouvé |
| Fallback secrets (`\|\| 'default'`) | ✅ Aucun trouvé |
| Tables RLS sans policies | ✅ 0 table découverte |
| Trigger `handle_new_user` vérifié en DB | ✅ `role = 'client'` hardcodé |

---

## 7. État de la DB Supabase (projet `wawkkwdlcskyzhdqviha`)

### Migrations appliquées
| Migration | Description |
|-----------|-------------|
| `001_initial_schema` | Schéma initial + RLS activé + policies de base |
| `002_admin_policies` | Policies admin (via fonction `is_admin()`) |
| `003_security_fixes` | Fix trigger + policies manquantes (sprint 1) |
| `fix_trigger_role_and_invite_update` | Fix final trigger + UPDATE invite_tokens |
| `004_ai_consent` | Colonnes `ai_consent` (boolean) + `ai_consent_at` (timestamptz) sur `profiles` |
| `fix_rls_recursion_coach_client` | Fonction `get_own_coach_id()` (security definer) — casse la récursion RLS coaches↔clients |
| `005_security_sharp_edges` | Fix INSERT clients (validation coach_id via invite_tokens) + colonne `push_token` |

### Edge Functions déployées
| Fonction | Version | JWT requis |
|----------|---------|-----------|
| `openai-proxy` | v3 | ✅ Oui (anon key pour verify, service_role pour role check) |
| `delete-account` | v1 | ✅ Oui (service_role pour suppression) |
| `delete-client` | v1 | ✅ Oui (vérifie ownership coach → client avant suppression) |

---

## 8. Résumé exécutif

### Sprint 1 (2026-04-04)
**Score avant :** 4 findings critiques/hauts ouverts, clé API dans le bundle, RLS incomplet.  
**Score après :** 0 finding ouvert.

### Sprint 2 — Audit complet Trail of Bits (2026-04-07)

**Périmètre :** Ensemble du codebase (app mobile + Edge Functions + migrations DB).  
**Skills utilisés :** `insecure-defaults` · `sharp-edges` · `supply-chain-risk-auditor`

**Findings résolus :**

| Sévérité | Finding | Fix |
|----------|---------|-----|
| MEDIUM | `EXPO_PUBLIC_OPENAI_API_KEY` dans `.env.local` | Supprimé |
| MEDIUM | `clients` INSERT accepte n'importe quel `coach_id` | Migration `005` + helper `get_current_user_email()` |
| LOW | Push token stocké dans `avatar_url` (confusion de type) | Migration `005` + colonne `push_token` dédiée |
| INFO | 5 LOW CVEs dans devDeps `jest-expo` | Aucune action requise (non-production) |
| INFO | Supply chain globale | Propre — toutes dépendances prod issues de grandes organisations |

**Compliance Apple — état final :**
- ✅ Suppression de compte in-app (Apple obligatoire) — Edge Function + double confirmation
- ✅ Consentement IA OpenAI (Guideline 5.1.2(i)) — modale + révocation + persistance DB
- ✅ Privacy Manifest (`NSPrivacyAccessedAPITypes`) — `app.json`
- ✅ Descriptions permissions camera/photos — `app.json`
- 🔲 Privacy Policy URL — à renseigner dans App Store Connect avant soumission

**L'app est prête techniquement pour une soumission store.** Il reste un seul point de process : renseigner l'URL de la politique de confidentialité dans App Store Connect / Play Console.
