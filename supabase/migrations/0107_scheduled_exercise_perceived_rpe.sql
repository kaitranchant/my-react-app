-- Logged perceived RPE for exercises prescribed with an RPE target.

alter table public.scheduled_workout_exercises
  add column if not exists perceived_rpe text;

comment on column public.scheduled_workout_exercises.perceived_rpe is
  'Client or coach logged perceived RPE for this exercise (1–10 scale).';
