-- Team-specific squat / bench / deadlift mapping for leaderboard SBD totals (0047)

alter table public.teams
  add column if not exists squat_exercise_id uuid references public.exercises (id) on delete set null,
  add column if not exists bench_exercise_id uuid references public.exercises (id) on delete set null,
  add column if not exists deadlift_exercise_id uuid references public.exercises (id) on delete set null;

create index if not exists teams_squat_exercise_id_idx on public.teams (squat_exercise_id)
  where squat_exercise_id is not null;
create index if not exists teams_bench_exercise_id_idx on public.teams (bench_exercise_id)
  where bench_exercise_id is not null;
create index if not exists teams_deadlift_exercise_id_idx on public.teams (deadlift_exercise_id)
  where deadlift_exercise_id is not null;

comment on column public.teams.squat_exercise_id is
  'Exercise used for team leaderboard powerlifting total (squat). Falls back to name matching when null.';
comment on column public.teams.bench_exercise_id is
  'Exercise used for team leaderboard powerlifting total (bench). Falls back to name matching when null.';
comment on column public.teams.deadlift_exercise_id is
  'Exercise used for team leaderboard powerlifting total (deadlift). Falls back to name matching when null.';
