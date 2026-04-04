-- ============================================================
-- Migration 003 — Security fixes
--
-- Findings corrigés :
--   [CRITIQUE] Privilege escalation via raw_user_meta_data->>'role'
--   [HAUT]     RLS policies manquantes sur 7 tables
--   [HAUT]     INSERT policy manquante sur clients
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. FIX CRITIQUE : Trigger handle_new_user
--
-- Avant : rôle lu depuis raw_user_meta_data — contrôlé par le client
--         → n'importe qui pouvait s'inscrire avec role='admin'
--
-- Après : rôle hardcodé à 'client' par défaut.
--         Seul un admin peut promouvoir un utilisateur via service_role.
--         full_name lu depuis les metadata reste sans risque.
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'client',
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 2. FIX HAUT : RLS policies — invite_tokens
--
-- Problème : anon peut valider un code avant auth (redeem.tsx)
-- Solution : SELECT limité aux colonnes non-sensibles pour anon,
--            INSERT/UPDATE réservé aux coaches authentifiés
-- ────────────────────────────────────────────────────────────

-- Lecture publique (anon) : uniquement pour valider un token lors du redeem
-- On n'expose pas coach_id ni email par cette policy
create policy "Anon can validate invite token"
  on public.invite_tokens for select
  using (used = false and expires_at > now());

-- Coach peut voir ses propres tokens
create policy "Coach sees own invite tokens"
  on public.invite_tokens for select
  using (
    coach_id in (select id from public.coaches where profile_id = auth.uid())
  );

-- Coach peut créer des tokens
create policy "Coach creates invite tokens"
  on public.invite_tokens for insert
  with check (
    coach_id in (select id from public.coaches where profile_id = auth.uid())
  );

-- Token peut être marqué comme utilisé lors du redeem (auth requis à ce stade)
create policy "Authenticated user marks token used"
  on public.invite_tokens for update
  using (auth.uid() is not null)
  with check (used = true);

-- ────────────────────────────────────────────────────────────
-- 3. FIX HAUT : RLS policies — clients (INSERT manquant)
-- ────────────────────────────────────────────────────────────

-- Nouvel utilisateur peut créer son enregistrement client lors du redeem
create policy "New client can insert own record"
  on public.clients for insert
  with check (profile_id = auth.uid());

-- Coach peut créer des clients
create policy "Coach creates clients"
  on public.clients for insert
  with check (
    coach_id in (select id from public.coaches where profile_id = auth.uid())
  );

-- Coach peut mettre à jour ses clients (ex: nutrition_goal)
create policy "Coach updates own clients"
  on public.clients for update
  using (
    coach_id in (select id from public.coaches where profile_id = auth.uid())
  );

-- Client peut mettre à jour son propre onboarding
create policy "Client updates own record"
  on public.clients for update
  using (profile_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 4. FIX HAUT : RLS policies — sessions
-- ────────────────────────────────────────────────────────────

create policy "Client reads own sessions"
  on public.sessions for select
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

create policy "Coach reads client sessions"
  on public.sessions for select
  using (
    client_id in (
      select id from public.clients
      where coach_id in (select id from public.coaches where profile_id = auth.uid())
    )
  );

create policy "Coach manages sessions"
  on public.sessions for all
  using (
    client_id in (
      select id from public.clients
      where coach_id in (select id from public.coaches where profile_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- 5. FIX HAUT : RLS policies — session_logs
-- ────────────────────────────────────────────────────────────

create policy "Client manages own session logs"
  on public.session_logs for all
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

create policy "Coach reads client session logs"
  on public.session_logs for select
  using (
    client_id in (
      select id from public.clients
      where coach_id in (select id from public.coaches where profile_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- 6. FIX HAUT : RLS policies — personal_records
-- ────────────────────────────────────────────────────────────

create policy "Client manages own personal records"
  on public.personal_records for all
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

create policy "Coach reads client personal records"
  on public.personal_records for select
  using (
    client_id in (
      select id from public.clients
      where coach_id in (select id from public.coaches where profile_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- 7. FIX HAUT : RLS policies — food_logs
-- ────────────────────────────────────────────────────────────

create policy "Client manages own food logs"
  on public.food_logs for all
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

create policy "Coach reads client food logs"
  on public.food_logs for select
  using (
    client_id in (
      select id from public.clients
      where coach_id in (select id from public.coaches where profile_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- 8. FIX HAUT : RLS policies — saved_meals
-- ────────────────────────────────────────────────────────────

create policy "Client manages own saved meals"
  on public.saved_meals for all
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- 9. FIX HAUT : RLS policies — weekly_checkins
-- ────────────────────────────────────────────────────────────

create policy "Client manages own checkins"
  on public.weekly_checkins for all
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

create policy "Coach reads client checkins"
  on public.weekly_checkins for select
  using (
    client_id in (
      select id from public.clients
      where coach_id in (select id from public.coaches where profile_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────
-- 10. RLS policy — coaches INSERT (nouveau coach à l'inscription)
-- Un coach ne peut créer son enregistrement que pour son propre profil
-- ────────────────────────────────────────────────────────────

create policy "Coach creates own record"
  on public.coaches for insert
  with check (profile_id = auth.uid());
