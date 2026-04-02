-- supabase/migrations/001_initial_schema.sql

-- Profiles (extension de auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('coach', 'client', 'admin')),
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Coaches
create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('active', 'pending')),
  created_at timestamptz default now()
);

-- Invite tokens
create table public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  email text,
  used boolean not null default false,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  coach_id uuid not null references public.coaches on delete cascade,
  onboarding jsonb,
  nutrition_goal jsonb,
  created_at timestamptz default now()
);

-- Programmes
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  coach_id uuid not null references public.coaches on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'approved')),
  exercises jsonb not null default '[]',
  coach_notes text,
  ai_prompt text,
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- Séances planifiées
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  day_label text not null,
  order_index int not null
);

-- Logs de séances
create table public.session_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  sets jsonb not null default '[]',
  completed boolean not null default false,
  logged_at timestamptz default now()
);

-- Personal Records
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  exercise_name text not null,
  weight numeric not null,
  reps int not null,
  achieved_at timestamptz default now()
);

-- Journal alimentaire
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  logged_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  foods jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Repas sauvegardés
create table public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  name text not null,
  foods jsonb not null default '[]',
  created_at timestamptz default now()
);

-- Check-ins hebdomadaires
create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients on delete cascade,
  week_start date not null,
  energy int not null check (energy between 1 and 5),
  recovery int not null check (recovery between 1 and 5),
  mood int not null check (mood between 1 and 5),
  created_at timestamptz default now(),
  unique (client_id, week_start)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.invite_tokens enable row level security;
alter table public.clients enable row level security;
alter table public.programs enable row level security;
alter table public.sessions enable row level security;
alter table public.session_logs enable row level security;
alter table public.personal_records enable row level security;
alter table public.food_logs enable row level security;
alter table public.saved_meals enable row level security;
alter table public.weekly_checkins enable row level security;

-- Policies profiles
create policy "Users can read their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Policies coaches : un coach lit son propre enregistrement
create policy "Coach reads own record"
  on public.coaches for select using (profile_id = auth.uid());

-- Policies clients : coach voit ses clients, client voit son propre enregistrement
create policy "Coach sees own clients"
  on public.clients for select using (
    coach_id in (select id from public.coaches where profile_id = auth.uid())
  );

create policy "Client sees own record"
  on public.clients for select using (profile_id = auth.uid());

-- Policies programs
create policy "Coach manages own programs"
  on public.programs for all using (
    coach_id in (select id from public.coaches where profile_id = auth.uid())
  );

create policy "Client reads own approved programs"
  on public.programs for select using (
    client_id in (select id from public.clients where profile_id = auth.uid())
    and status = 'approved'
  );

-- Trigger : créer un profile après signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
