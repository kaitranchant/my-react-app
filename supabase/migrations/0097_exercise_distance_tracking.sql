-- Distance as a third rep_mode for scheduled exercises, plus per-set distance logging.

alter table public.scheduled_workout_exercises
  drop constraint if exists scheduled_workout_exercises_rep_mode_check;

alter table public.scheduled_workout_exercises
  add constraint scheduled_workout_exercises_rep_mode_check
  check (rep_mode in ('reps', 'time', 'distance'));

alter table public.program_scheduled_workout_exercises
  drop constraint if exists program_scheduled_workout_exercises_rep_mode_check;

alter table public.program_scheduled_workout_exercises
  add constraint program_scheduled_workout_exercises_rep_mode_check
  check (rep_mode in ('reps', 'time', 'distance'));

alter table public.workout_log_sets
  add column if not exists distance_meters integer
  check (distance_meters is null or distance_meters >= 0);

comment on column public.workout_log_sets.distance_meters is
  'Logged distance in meters for distance-based exercises.';
