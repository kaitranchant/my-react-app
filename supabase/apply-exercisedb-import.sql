-- ExerciseDB import fields on exercises (migration 0007).
-- Run after apply-library.sql if browse/import shows column errors.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'exercise_source') then
    create type public.exercise_source as enum ('custom', 'exercisedb');
  end if;
end
$$;

alter table public.exercises
  add column if not exists source public.exercise_source not null default 'custom',
  add column if not exists external_id text,
  add column if not exists image_url text,
  add column if not exists difficulty text,
  add column if not exists category text;

create unique index if not exists exercises_coach_external_id_idx
  on public.exercises (coach_id, external_id)
  where external_id is not null;

create index if not exists exercises_source_idx on public.exercises (source);
