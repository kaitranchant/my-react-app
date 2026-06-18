-- Creates program_scheduled_workouts + program_scheduled_workout_exercises tables
-- (migrations 0012 and 0013).
-- Run in Supabase Dashboard → SQL if program calendar shows:
--   "Could not find the table 'public.program_scheduled_workouts' in the schema cache"
--
-- Or CLI: npx supabase login && yarn db:link && yarn db:push

-- ---------------------------------------------------------------------------
-- program_scheduled_workouts
-- ---------------------------------------------------------------------------

create table if not exists public.program_scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  day_offset integer not null check (day_offset >= 0),
  name text not null,
  notes text,
  library_workout_id uuid references public.workouts (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint program_scheduled_workouts_program_day_key unique (program_id, day_offset)
);

create index if not exists program_scheduled_workouts_coach_id_idx
  on public.program_scheduled_workouts (coach_id);
create index if not exists program_scheduled_workouts_program_id_idx
  on public.program_scheduled_workouts (program_id);

drop trigger if exists program_scheduled_workouts_set_updated_at on public.program_scheduled_workouts;
create trigger program_scheduled_workouts_set_updated_at
  before update on public.program_scheduled_workouts
  for each row execute function public.set_updated_at();

alter table public.program_scheduled_workouts enable row level security;

drop policy if exists "Coaches can view their program scheduled workouts" on public.program_scheduled_workouts;
create policy "Coaches can view their program scheduled workouts"
  on public.program_scheduled_workouts for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their program scheduled workouts" on public.program_scheduled_workouts;
create policy "Coaches can insert their program scheduled workouts"
  on public.program_scheduled_workouts for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their program scheduled workouts" on public.program_scheduled_workouts;
create policy "Coaches can update their program scheduled workouts"
  on public.program_scheduled_workouts for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their program scheduled workouts" on public.program_scheduled_workouts;
create policy "Coaches can delete their program scheduled workouts"
  on public.program_scheduled_workouts for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- program_scheduled_workout_exercises
-- ---------------------------------------------------------------------------

create table if not exists public.program_scheduled_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  program_scheduled_workout_id uuid not null references public.program_scheduled_workouts (id) on delete cascade,
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
    where conname = 'program_scheduled_workout_exercises_rep_mode_check'
  ) then
    alter table public.program_scheduled_workout_exercises
      add constraint program_scheduled_workout_exercises_rep_mode_check
      check (rep_mode in ('reps', 'time'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'program_scheduled_workout_exercises_exercise_block_check'
  ) then
    alter table public.program_scheduled_workout_exercises
      add constraint program_scheduled_workout_exercises_exercise_block_check
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

create index if not exists program_scheduled_workout_exercises_workout_id_idx
  on public.program_scheduled_workout_exercises (program_scheduled_workout_id);
create index if not exists program_scheduled_workout_exercises_exercise_id_idx
  on public.program_scheduled_workout_exercises (exercise_id);

drop trigger if exists program_scheduled_workout_exercises_set_updated_at on public.program_scheduled_workout_exercises;
create trigger program_scheduled_workout_exercises_set_updated_at
  before update on public.program_scheduled_workout_exercises
  for each row execute function public.set_updated_at();

alter table public.program_scheduled_workout_exercises enable row level security;

drop policy if exists "Coaches can view program scheduled workout exercises" on public.program_scheduled_workout_exercises;
create policy "Coaches can view program scheduled workout exercises"
  on public.program_scheduled_workout_exercises for select
  using (
    exists (
      select 1
      from public.program_scheduled_workouts psw
      where psw.id = program_scheduled_workout_id
        and psw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert program scheduled workout exercises" on public.program_scheduled_workout_exercises;
create policy "Coaches can insert program scheduled workout exercises"
  on public.program_scheduled_workout_exercises for insert
  with check (
    exists (
      select 1
      from public.program_scheduled_workouts psw
      where psw.id = program_scheduled_workout_id
        and psw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update program scheduled workout exercises" on public.program_scheduled_workout_exercises;
create policy "Coaches can update program scheduled workout exercises"
  on public.program_scheduled_workout_exercises for update
  using (
    exists (
      select 1
      from public.program_scheduled_workouts psw
      where psw.id = program_scheduled_workout_id
        and psw.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.program_scheduled_workouts psw
      where psw.id = program_scheduled_workout_id
        and psw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete program scheduled workout exercises" on public.program_scheduled_workout_exercises;
create policy "Coaches can delete program scheduled workout exercises"
  on public.program_scheduled_workout_exercises for delete
  using (
    exists (
      select 1
      from public.program_scheduled_workouts psw
      where psw.id = program_scheduled_workout_id
        and psw.coach_id = auth.uid()
    )
  );
