-- Team training calendar: shared schedule that fans out to member calendars

-- ---------------------------------------------------------------------------
-- team_scheduled_workouts
-- ---------------------------------------------------------------------------

create table if not exists public.team_scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  scheduled_date date not null,
  name text not null,
  notes text,
  library_workout_id uuid references public.workouts (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_scheduled_workouts_coach_id_idx
  on public.team_scheduled_workouts (coach_id);
create index if not exists team_scheduled_workouts_team_id_idx
  on public.team_scheduled_workouts (team_id);
create index if not exists team_scheduled_workouts_team_date_idx
  on public.team_scheduled_workouts (team_id, scheduled_date);

drop trigger if exists team_scheduled_workouts_set_updated_at on public.team_scheduled_workouts;
create trigger team_scheduled_workouts_set_updated_at
  before update on public.team_scheduled_workouts
  for each row execute function public.set_updated_at();

alter table public.team_scheduled_workouts enable row level security;

drop policy if exists "Coaches can view their team scheduled workouts" on public.team_scheduled_workouts;
create policy "Coaches can view their team scheduled workouts"
  on public.team_scheduled_workouts for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their team scheduled workouts" on public.team_scheduled_workouts;
create policy "Coaches can insert their team scheduled workouts"
  on public.team_scheduled_workouts for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their team scheduled workouts" on public.team_scheduled_workouts;
create policy "Coaches can update their team scheduled workouts"
  on public.team_scheduled_workouts for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their team scheduled workouts" on public.team_scheduled_workouts;
create policy "Coaches can delete their team scheduled workouts"
  on public.team_scheduled_workouts for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- team_scheduled_workout_exercises
-- ---------------------------------------------------------------------------

create table if not exists public.team_scheduled_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  team_scheduled_workout_id uuid not null references public.team_scheduled_workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  sort_order integer not null default 0,
  sets text,
  reps text,
  prescription text,
  superset_group text,
  exercise_block text,
  workout_notes text,
  rep_mode text not null default 'reps',
  each_side boolean not null default false,
  tempo text,
  rest_seconds text,
  weight_percent text,
  rpe_target text,
  tracking_options jsonb not null default '{
    "completionLift": false,
    "bodyweight": false,
    "coachCompletes": false,
    "disablePrTracking": false,
    "forcePrUpdate": false,
    "trackBarSpeed": false,
    "trackPeakPower": false,
    "trackReps": true,
    "trackVolume": true
  }'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_scheduled_workout_exercises_rep_mode_check'
  ) then
    alter table public.team_scheduled_workout_exercises
      add constraint team_scheduled_workout_exercises_rep_mode_check
      check (rep_mode in ('reps', 'time', 'distance'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'team_scheduled_workout_exercises_exercise_block_check'
  ) then
    alter table public.team_scheduled_workout_exercises
      add constraint team_scheduled_workout_exercises_exercise_block_check
      check (
        exercise_block is null
        or exercise_block in (
          'warmup',
          'activation',
          'main_lift',
          'accessory',
          'core',
          'conditioning',
          'cooldown',
          'mobility',
          'finisher'
        )
      );
  end if;
end
$$;

create index if not exists team_scheduled_workout_exercises_workout_id_idx
  on public.team_scheduled_workout_exercises (team_scheduled_workout_id);
create index if not exists team_scheduled_workout_exercises_exercise_id_idx
  on public.team_scheduled_workout_exercises (exercise_id);

drop trigger if exists team_scheduled_workout_exercises_set_updated_at on public.team_scheduled_workout_exercises;
create trigger team_scheduled_workout_exercises_set_updated_at
  before update on public.team_scheduled_workout_exercises
  for each row execute function public.set_updated_at();

alter table public.team_scheduled_workout_exercises enable row level security;

drop policy if exists "Coaches can view team scheduled workout exercises" on public.team_scheduled_workout_exercises;
create policy "Coaches can view team scheduled workout exercises"
  on public.team_scheduled_workout_exercises for select
  using (
    exists (
      select 1
      from public.team_scheduled_workouts tsw
      where tsw.id = team_scheduled_workout_id
        and tsw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert team scheduled workout exercises" on public.team_scheduled_workout_exercises;
create policy "Coaches can insert team scheduled workout exercises"
  on public.team_scheduled_workout_exercises for insert
  with check (
    exists (
      select 1
      from public.team_scheduled_workouts tsw
      where tsw.id = team_scheduled_workout_id
        and tsw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update team scheduled workout exercises" on public.team_scheduled_workout_exercises;
create policy "Coaches can update team scheduled workout exercises"
  on public.team_scheduled_workout_exercises for update
  using (
    exists (
      select 1
      from public.team_scheduled_workouts tsw
      where tsw.id = team_scheduled_workout_id
        and tsw.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.team_scheduled_workouts tsw
      where tsw.id = team_scheduled_workout_id
        and tsw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete team scheduled workout exercises" on public.team_scheduled_workout_exercises;
create policy "Coaches can delete team scheduled workout exercises"
  on public.team_scheduled_workout_exercises for delete
  using (
    exists (
      select 1
      from public.team_scheduled_workouts tsw
      where tsw.id = team_scheduled_workout_id
        and tsw.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Link member calendar rows back to the team schedule source
-- ---------------------------------------------------------------------------

alter table public.client_scheduled_workouts
  add column if not exists team_scheduled_workout_id uuid
    references public.team_scheduled_workouts (id) on delete set null;

create index if not exists client_scheduled_workouts_team_scheduled_workout_id_idx
  on public.client_scheduled_workouts (team_scheduled_workout_id)
  where team_scheduled_workout_id is not null;
