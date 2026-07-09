-- Coach notes added while logging a workout (separate from builder prescription notes).

alter table public.scheduled_workout_exercises
  add column if not exists coach_session_notes text;

comment on column public.scheduled_workout_exercises.coach_session_notes is
  'Coach notes added during workout logging for this session.';
comment on column public.scheduled_workout_exercises.workout_notes is
  'Coach prescription notes from the workout builder for this exercise.';
