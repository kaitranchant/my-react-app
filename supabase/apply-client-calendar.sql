-- Client-specific workout calendar: scheduled workouts by day + exercises

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'scheduled_workout_status') then
    create type public.scheduled_workout_status as enum ('scheduled', 'completed', 'skipped');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- client_scheduled_workouts
-- ---------------------------------------------------------------------------

create table if not exists public.client_scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  scheduled_date date not null,
  name text not null,
  notes text,
  library_workout_id uuid references public.workouts (id) on delete set null,
  status public.scheduled_workout_status not null default 'scheduled',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_scheduled_workouts_client_date_key unique (client_id, scheduled_date)
);

create index if not exists client_scheduled_workouts_coach_id_idx
  on public.client_scheduled_workouts (coach_id);
create index if not exists client_scheduled_workouts_client_id_idx
  on public.client_scheduled_workouts (client_id);
create index if not exists client_scheduled_workouts_scheduled_date_idx
  on public.client_scheduled_workouts (scheduled_date);

drop trigger if exists client_scheduled_workouts_set_updated_at on public.client_scheduled_workouts;
create trigger client_scheduled_workouts_set_updated_at
  before update on public.client_scheduled_workouts
  for each row execute function public.set_updated_at();

alter table public.client_scheduled_workouts enable row level security;

drop policy if exists "Coaches can view their client scheduled workouts" on public.client_scheduled_workouts;
create policy "Coaches can view their client scheduled workouts"
  on public.client_scheduled_workouts for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their client scheduled workouts" on public.client_scheduled_workouts;
create policy "Coaches can insert their client scheduled workouts"
  on public.client_scheduled_workouts for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their client scheduled workouts" on public.client_scheduled_workouts;
create policy "Coaches can update their client scheduled workouts"
  on public.client_scheduled_workouts for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their client scheduled workouts" on public.client_scheduled_workouts;
create policy "Coaches can delete their client scheduled workouts"
  on public.client_scheduled_workouts for delete
  using (auth.uid() = coach_id);

drop policy if exists "Clients can view their scheduled workouts" on public.client_scheduled_workouts;
create policy "Clients can view their scheduled workouts"
  on public.client_scheduled_workouts for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- scheduled_workout_exercises
-- ---------------------------------------------------------------------------

create table if not exists public.scheduled_workout_exercises (
  id uuid primary key default gen_random_uuid(),
  scheduled_workout_id uuid not null references public.client_scheduled_workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  sort_order integer not null default 0,
  sets text,
  reps text,
  prescription text,
  superset_group text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists scheduled_workout_exercises_workout_id_idx
  on public.scheduled_workout_exercises (scheduled_workout_id);
create index if not exists scheduled_workout_exercises_exercise_id_idx
  on public.scheduled_workout_exercises (exercise_id);

drop trigger if exists scheduled_workout_exercises_set_updated_at on public.scheduled_workout_exercises;
create trigger scheduled_workout_exercises_set_updated_at
  before update on public.scheduled_workout_exercises
  for each row execute function public.set_updated_at();

alter table public.scheduled_workout_exercises enable row level security;

drop policy if exists "Coaches can view scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Coaches can view scheduled workout exercises"
  on public.scheduled_workout_exercises for select
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = scheduled_workout_id
        and csw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Coaches can insert scheduled workout exercises"
  on public.scheduled_workout_exercises for insert
  with check (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = scheduled_workout_id
        and csw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Coaches can update scheduled workout exercises"
  on public.scheduled_workout_exercises for update
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = scheduled_workout_id
        and csw.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = scheduled_workout_id
        and csw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Coaches can delete scheduled workout exercises"
  on public.scheduled_workout_exercises for delete
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = scheduled_workout_id
        and csw.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can view their scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Clients can view their scheduled workout exercises"
  on public.scheduled_workout_exercises for select
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      join public.clients c on c.id = csw.client_id
      where csw.id = scheduled_workout_id
        and c.user_id = auth.uid()
    )
  );

-- Clients need read access to exercises referenced in their scheduled workouts
drop policy if exists "Clients can view exercises in their scheduled workouts" on public.exercises;
create policy "Clients can view exercises in their scheduled workouts"
  on public.exercises for select
  using (
    exists (
      select 1
      from public.scheduled_workout_exercises swe
      join public.client_scheduled_workouts csw on csw.id = swe.scheduled_workout_id
      join public.clients c on c.id = csw.client_id
      where swe.exercise_id = exercises.id
        and c.user_id = auth.uid()
    )
  );
