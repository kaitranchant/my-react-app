-- Team assessment sessions: run one set of tests across a team roster,
-- persisting scores into each member's client assessment history.

-- ---------------------------------------------------------------------------
-- team_assessment_sessions
-- ---------------------------------------------------------------------------

create table if not exists public.team_assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  assessed_at timestamptz not null default timezone('utc', now()),
  overall_notes text,
  status text not null default 'in_progress',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint team_assessment_sessions_status_allowed check (
    status in ('in_progress', 'completed')
  )
);

create index if not exists team_assessment_sessions_team_id_idx
  on public.team_assessment_sessions (team_id, assessed_at desc);

create index if not exists team_assessment_sessions_coach_id_idx
  on public.team_assessment_sessions (coach_id);

drop trigger if exists team_assessment_sessions_set_updated_at on public.team_assessment_sessions;
create trigger team_assessment_sessions_set_updated_at
  before update on public.team_assessment_sessions
  for each row execute function public.set_updated_at();

alter table public.team_assessment_sessions enable row level security;

drop policy if exists "Coaches can view their team assessment sessions" on public.team_assessment_sessions;
create policy "Coaches can view their team assessment sessions"
  on public.team_assessment_sessions for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their team assessment sessions" on public.team_assessment_sessions;
create policy "Coaches can insert their team assessment sessions"
  on public.team_assessment_sessions for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their team assessment sessions" on public.team_assessment_sessions;
create policy "Coaches can update their team assessment sessions"
  on public.team_assessment_sessions for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their team assessment sessions" on public.team_assessment_sessions;
create policy "Coaches can delete their team assessment sessions"
  on public.team_assessment_sessions for delete
  using (auth.uid() = coach_id);

comment on table public.team_assessment_sessions is
  'Team-scoped assessment runs; per-member scores live in client_assessments linked via team_assessment_session_id.';

-- ---------------------------------------------------------------------------
-- team_assessment_session_items (ordered test list with rubric snapshots)
-- ---------------------------------------------------------------------------

create table if not exists public.team_assessment_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.team_assessment_sessions (id) on delete cascade,
  assessment_item_id uuid references public.assessment_items (id) on delete set null,
  item_name text not null,
  item_category public.assessment_item_category not null,
  rubric_type public.assessment_rubric_type not null,
  rubric_config jsonb not null default '{}'::jsonb,
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  constraint team_assessment_session_items_name_not_blank check (trim(item_name) <> ''),
  constraint team_assessment_session_items_rubric_config_object check (
    jsonb_typeof(rubric_config) = 'object'
  )
);

create index if not exists team_assessment_session_items_session_id_idx
  on public.team_assessment_session_items (session_id, sort_order);

alter table public.team_assessment_session_items enable row level security;

drop policy if exists "Coaches can view their team assessment session items" on public.team_assessment_session_items;
create policy "Coaches can view their team assessment session items"
  on public.team_assessment_session_items for select
  using (
    exists (
      select 1
      from public.team_assessment_sessions s
      where s.id = session_id
        and s.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert their team assessment session items" on public.team_assessment_session_items;
create policy "Coaches can insert their team assessment session items"
  on public.team_assessment_session_items for insert
  with check (
    exists (
      select 1
      from public.team_assessment_sessions s
      where s.id = session_id
        and s.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update their team assessment session items" on public.team_assessment_session_items;
create policy "Coaches can update their team assessment session items"
  on public.team_assessment_session_items for update
  using (
    exists (
      select 1
      from public.team_assessment_sessions s
      where s.id = session_id
        and s.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.team_assessment_sessions s
      where s.id = session_id
        and s.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete their team assessment session items" on public.team_assessment_session_items;
create policy "Coaches can delete their team assessment session items"
  on public.team_assessment_session_items for delete
  using (
    exists (
      select 1
      from public.team_assessment_sessions s
      where s.id = session_id
        and s.coach_id = auth.uid()
    )
  );

comment on table public.team_assessment_session_items is
  'Ordered tests selected for a team assessment session, with rubric snapshots.';

-- ---------------------------------------------------------------------------
-- Link member assessment sessions back to the team run
-- ---------------------------------------------------------------------------

alter table public.client_assessments
  add column if not exists team_assessment_session_id uuid
    references public.team_assessment_sessions (id) on delete set null;

create index if not exists client_assessments_team_session_idx
  on public.client_assessments (team_assessment_session_id)
  where team_assessment_session_id is not null;

comment on column public.client_assessments.team_assessment_session_id is
  'Set when this member session was created as part of a team assessment run.';
