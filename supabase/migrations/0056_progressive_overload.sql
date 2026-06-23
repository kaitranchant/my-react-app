-- Progressive overload coach approval workflow

alter table public.scheduled_workout_exercises
  add column if not exists target_weight text;

comment on column public.scheduled_workout_exercises.target_weight is
  'Coach-approved target load in lbs or kg for this session instance.';

-- ---------------------------------------------------------------------------
-- progressive_overload_decisions
-- ---------------------------------------------------------------------------

create table if not exists public.progressive_overload_decisions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  source_workout_id uuid not null references public.client_scheduled_workouts (id) on delete cascade,
  source_scheduled_exercise_id uuid not null references public.scheduled_workout_exercises (id) on delete cascade,
  source_session_date date not null,
  previous_weight numeric(8, 2) not null,
  suggested_weight numeric(8, 2) not null,
  status text not null check (status in ('approved', 'dismissed')),
  upcoming_updated_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_scheduled_exercise_id)
);

create index if not exists progressive_overload_decisions_coach_id_idx
  on public.progressive_overload_decisions (coach_id, created_at desc);

create index if not exists progressive_overload_decisions_client_id_idx
  on public.progressive_overload_decisions (client_id);

alter table public.progressive_overload_decisions enable row level security;

drop policy if exists "Coaches can view their progressive overload decisions" on public.progressive_overload_decisions;
create policy "Coaches can view their progressive overload decisions"
  on public.progressive_overload_decisions for select
  using (coach_id = auth.uid());

drop policy if exists "Coaches can insert their progressive overload decisions" on public.progressive_overload_decisions;
create policy "Coaches can insert their progressive overload decisions"
  on public.progressive_overload_decisions for insert
  with check (coach_id = auth.uid());

comment on table public.progressive_overload_decisions is
  'Coach approve/dismiss records for progressive overload suggestions from completed sessions.';
