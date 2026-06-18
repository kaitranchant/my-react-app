-- Creates program_scheduled_workout_exercises (migration 0013).
-- Run this if you already have program_scheduled_workouts but adding exercises shows:
--   "Could not find the table 'public.program_scheduled_workout_exercises' in the schema cache"
--
-- If you have neither table yet, use supabase/apply-program-calendar.sql instead.
-- Or CLI: npx supabase login && yarn db:link && yarn db:push

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
