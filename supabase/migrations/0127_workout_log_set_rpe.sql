-- Move perceived RPE from exercise-level to per-set logging.

alter table public.workout_log_sets
  add column if not exists rpe text;

comment on column public.workout_log_sets.rpe is
  'Logged perceived RPE for this set (1–10 scale).';

-- Backfill: copy the old exercise-level value onto existing logged sets.
update public.workout_log_sets wls
set rpe = swe.perceived_rpe
from public.scheduled_workout_exercises swe
where wls.scheduled_exercise_id = swe.id
  and wls.rpe is null
  and swe.perceived_rpe is not null
  and char_length(trim(swe.perceived_rpe)) > 0;
