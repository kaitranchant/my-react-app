-- Teams: coach-owned groups of clients sharing a program calendar

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  active_program_id uuid references public.programs (id) on delete set null,
  program_start_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists teams_coach_id_idx on public.teams (coach_id);
create index if not exists teams_active_program_id_idx on public.teams (active_program_id);

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

alter table public.teams enable row level security;

drop policy if exists "Coaches can view their teams" on public.teams;
create policy "Coaches can view their teams"
  on public.teams for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their teams" on public.teams;
create policy "Coaches can insert their teams"
  on public.teams for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their teams" on public.teams;
create policy "Coaches can update their teams"
  on public.teams for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their teams" on public.teams;
create policy "Coaches can delete their teams"
  on public.teams for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  joined_at timestamptz not null default timezone('utc', now()),
  unique (team_id, client_id)
);

create index if not exists team_members_team_id_idx on public.team_members (team_id);
create index if not exists team_members_client_id_idx on public.team_members (client_id);

alter table public.team_members enable row level security;

drop policy if exists "Coaches can view their team members" on public.team_members;
create policy "Coaches can view their team members"
  on public.team_members for select
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert their team members" on public.team_members;
create policy "Coaches can insert their team members"
  on public.team_members for insert
  with check (
    exists (
      select 1
      from public.teams t
      join public.clients c on c.id = client_id
      where t.id = team_id
        and t.coach_id = auth.uid()
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete their team members" on public.team_members;
create policy "Coaches can delete their team members"
  on public.team_members for delete
  using (
    exists (
      select 1
      from public.teams t
      where t.id = team_id
        and t.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- program_assignments: track team-sourced assignments
-- ---------------------------------------------------------------------------

alter table public.program_assignments
  add column if not exists team_id uuid references public.teams (id) on delete set null;

create index if not exists program_assignments_team_id_idx
  on public.program_assignments (team_id)
  where team_id is not null;
