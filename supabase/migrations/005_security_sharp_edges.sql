-- ============================================================
-- Migration 005 — Sharp edges security fixes
--
-- Findings corrigés :
--   [MEDIUM] clients INSERT policy ne valide pas le coach_id
--            → un nouvel utilisateur pouvait se rattacher à n'importe quel coach
--   [LOW]    push_token stocké dans avatar_url (confusion de type)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Helper : email de l'utilisateur courant
--    Nécessaire pour valider le token d'invitation dans la policy RLS
--    (auth.users n'est pas directement accessible depuis une policy normale)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE SET search_path = auth, public AS
$$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- ────────────────────────────────────────────────────────────
-- 2. FIX MEDIUM : clients INSERT — valider le coach_id via invite_tokens
--
-- Avant : WITH CHECK (profile_id = auth.uid())
--         → n'importe quel coach_id était accepté
--
-- Après : coach_id doit correspondre à un invite_token valide (non expiré,
--         non utilisé, avec l'email de l'utilisateur si renseigné)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "New client can insert own record" ON public.clients;

CREATE POLICY "New client can insert own record"
  ON public.clients FOR INSERT
  WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.invite_tokens it
      WHERE it.coach_id = coach_id
        AND it.used = false
        AND it.expires_at > now()
        AND (
          it.email IS NULL
          OR it.email = public.get_current_user_email()
        )
    )
  );

-- ────────────────────────────────────────────────────────────
-- 3. FIX LOW : colonne push_token dédiée sur profiles
--
-- Avant : push token stocké dans avatar_url (confusion de type,
--         écrase la photo de profil)
--
-- Après : colonne push_token TEXT dédiée
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token text;
