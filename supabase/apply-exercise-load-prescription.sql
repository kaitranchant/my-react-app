-- Adds weight_percent and rpe_target to scheduled workout exercise tables.
-- Run if exercise prescription saves fail with missing column errors.

alter table public.scheduled_workout_exercises
  add column if not exists weight_percent text,
  add column if not exists rpe_target text;

alter table public.program_scheduled_workout_exercises
  add column if not exists weight_percent text,
  add column if not exists rpe_target text;
