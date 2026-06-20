-- Load prescription fields for scheduled workout exercises

alter table public.scheduled_workout_exercises
  add column if not exists weight_percent text,
  add column if not exists rpe_target text;

alter table public.program_scheduled_workout_exercises
  add column if not exists weight_percent text,
  add column if not exists rpe_target text;

comment on column public.scheduled_workout_exercises.weight_percent is
  'Target load as percent of client 1RM, e.g. 75 or 70-80.';
comment on column public.scheduled_workout_exercises.rpe_target is
  'Target RPE for working sets, e.g. 8 or 7-8.';

comment on column public.program_scheduled_workout_exercises.weight_percent is
  'Target load as percent of client 1RM, e.g. 75 or 70-80.';
comment on column public.program_scheduled_workout_exercises.rpe_target is
  'Target RPE for working sets, e.g. 8 or 7-8.';
