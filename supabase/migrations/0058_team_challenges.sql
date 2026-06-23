-- Team challenges: coach-created time-boxed competitions with live standings

-- ---------------------------------------------------------------------------
-- team_challenge_status enum
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_challenge_status') then
    create type public.team_challenge_status as enum (
      'draft',
      'active',
      'completed',
      'cancelled'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- team_challenges
-- ---------------------------------------------------------------------------

create table if not exists public.team_challenges (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  metric text not null,
  exercise_id uuid references public.exercises (id) on delete set null,
  formula text,
  weight_class_filter text,
  start_date date not null,
  end_date date not null,
  status public.team_challenge_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint team_challenges_date_range_check check (end_date >= start_date)
);

create index if not exists team_challenges_team_id_idx
  on public.team_challenges (team_id, created_at desc);

create index if not exists team_challenges_team_status_idx
  on public.team_challenges (team_id, status, start_date, end_date);

drop trigger if exists team_challenges_set_updated_at on public.team_challenges;
create trigger team_challenges_set_updated_at
  before update on public.team_challenges
  for each row execute function public.set_updated_at();

alter table public.team_challenges enable row level security;

-- ---------------------------------------------------------------------------
-- Coach policies
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their team challenges" on public.team_challenges;
create policy "Coaches can view their team challenges"
  on public.team_challenges for select
  using (public.can_coach_access_team(team_id));

drop policy if exists "Coaches can insert their team challenges" on public.team_challenges;
create policy "Coaches can insert their team challenges"
  on public.team_challenges for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_team(team_id)
  );

drop policy if exists "Coaches can update their team challenges" on public.team_challenges;
create policy "Coaches can update their team challenges"
  on public.team_challenges for update
  using (public.can_coach_access_team(team_id))
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_team(team_id)
  );

drop policy if exists "Coaches can delete their team challenges" on public.team_challenges;
create policy "Coaches can delete their team challenges"
  on public.team_challenges for delete
  using (public.can_coach_access_team(team_id));

-- ---------------------------------------------------------------------------
-- Client policies
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can view published team challenges" on public.team_challenges;
create policy "Clients can view published team challenges"
  on public.team_challenges for select
  using (
    public.is_team_member(team_id)
    and status in ('active', 'completed')
  );

comment on table public.team_challenges is
  'Coach-created time-boxed team competitions. Standings are computed live from workout data.';
