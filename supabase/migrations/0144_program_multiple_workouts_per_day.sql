-- Allow multiple program workouts on the same day_offset (AM/PM sessions).
alter table public.program_scheduled_workouts
  drop constraint if exists program_scheduled_workouts_program_day_key;

create index if not exists program_scheduled_workouts_program_day_idx
  on public.program_scheduled_workouts (program_id, day_offset);
