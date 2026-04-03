-- Permettre à l'admin de lire tous les profils
create policy "Admin reads all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Permettre à l'admin de lire tous les coaches
create policy "Admin reads all coaches"
  on public.coaches for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Permettre à l'admin de mettre à jour le statut des coaches
create policy "Admin updates coach status"
  on public.coaches for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
