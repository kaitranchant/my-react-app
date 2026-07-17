-- Track which program template day produced each team-calendar workout.

alter table public.team_scheduled_workouts
  add column if not exists program_scheduled_workout_id uuid
    references public.program_scheduled_workouts (id) on delete cascade;

create unique index if not exists team_scheduled_workouts_program_source_idx
  on public.team_scheduled_workouts (team_id, program_scheduled_workout_id)
  where program_scheduled_workout_id is not null;
