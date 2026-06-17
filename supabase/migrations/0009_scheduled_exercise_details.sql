-- Extended prescription and tracking options for scheduled workout exercises

alter table public.scheduled_workout_exercises
  add column if not exists workout_notes text,
  add column if not exists rep_mode text not null default 'reps',
  add column if not exists each_side boolean not null default false,
  add column if not exists tempo text,
  add column if not exists rest_seconds text,
  add column if not exists tracking_options jsonb not null default '{
    "completionLift": false,
    "bodyweight": false,
    "coachCompletes": false,
    "disablePrTracking": false,
    "forcePrUpdate": false,
    "trackBarSpeed": false,
    "trackPeakPower": false,
    "trackReps": true,
    "trackVolume": true
  }'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scheduled_workout_exercises_rep_mode_check'
  ) then
    alter table public.scheduled_workout_exercises
      add constraint scheduled_workout_exercises_rep_mode_check
      check (rep_mode in ('reps', 'time'));
  end if;
end
$$;

comment on column public.scheduled_workout_exercises.workout_notes is
  'Coach notes specific to this workout instance (max 255 chars in app).';
comment on column public.scheduled_workout_exercises.tracking_options is
  'Logging and PR behavior flags for client workout tracking.';
