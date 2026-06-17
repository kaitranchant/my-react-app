-- Creates exercises and workouts tables (migration 0006).
-- Run in Supabase Dashboard → SQL if /library/exercises or /library/workouts show
--   "Could not find the table 'public.exercises' in the schema cache"
--
-- Requires programs tables from apply-programs.sql first if you haven't run apply-remote.sql.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'exercise_status') then
    create type public.exercise_status as enum ('active', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'workout_status') then
    create type public.workout_status as enum ('draft', 'active', 'archived');
  end if;
end
$$;

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  instructions text,
  muscle_group text,
  equipment text,
  status public.exercise_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists exercises_coach_id_idx on public.exercises (coach_id);
create index if not exists exercises_status_idx on public.exercises (status);
create index if not exists exercises_muscle_group_idx on public.exercises (muscle_group);

drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;

drop policy if exists "Coaches can view their exercises" on public.exercises;
create policy "Coaches can view their exercises"
  on public.exercises for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their exercises" on public.exercises;
create policy "Coaches can insert their exercises"
  on public.exercises for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their exercises" on public.exercises;
create policy "Coaches can update their exercises"
  on public.exercises for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their exercises" on public.exercises;
create policy "Coaches can delete their exercises"
  on public.exercises for delete
  using (auth.uid() = coach_id);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  status public.workout_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists workouts_coach_id_idx on public.workouts (coach_id);
create index if not exists workouts_status_idx on public.workouts (status);

drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at
  before update on public.workouts
  for each row execute function public.set_updated_at();

alter table public.workouts enable row level security;

drop policy if exists "Coaches can view their workouts" on public.workouts;
create policy "Coaches can view their workouts"
  on public.workouts for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their workouts" on public.workouts;
create policy "Coaches can insert their workouts"
  on public.workouts for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their workouts" on public.workouts;
create policy "Coaches can update their workouts"
  on public.workouts for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their workouts" on public.workouts;
create policy "Coaches can delete their workouts"
  on public.workouts for delete
  using (auth.uid() = coach_id);
