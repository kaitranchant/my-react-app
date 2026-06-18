-- Workout logging: per-set results for scheduled workouts

alter type public.scheduled_workout_status add value if not exists 'in_progress';

alter table public.client_scheduled_workouts
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

create table if not exists public.workout_log_sets (
  id uuid primary key default gen_random_uuid(),
  scheduled_workout_id uuid not null references public.client_scheduled_workouts (id) on delete cascade,
  scheduled_exercise_id uuid not null references public.scheduled_workout_exercises (id) on delete cascade,
  set_number integer not null check (set_number >= 1),
  weight numeric(8, 2),
  reps integer check (reps is null or reps >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  bar_speed numeric(8, 4),
  peak_power numeric(10, 2),
  completed boolean not null default false,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workout_log_sets_exercise_set_key unique (scheduled_exercise_id, set_number)
);

create index if not exists workout_log_sets_scheduled_workout_id_idx
  on public.workout_log_sets (scheduled_workout_id);
create index if not exists workout_log_sets_scheduled_exercise_id_idx
  on public.workout_log_sets (scheduled_exercise_id);

drop trigger if exists workout_log_sets_set_updated_at on public.workout_log_sets;
create trigger workout_log_sets_set_updated_at
  before update on public.workout_log_sets
  for each row execute function public.set_updated_at();

alter table public.workout_log_sets enable row level security;

drop policy if exists "Coaches can view workout log sets" on public.workout_log_sets;
create policy "Coaches can view workout log sets"
  on public.workout_log_sets for select
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = scheduled_workout_id
        and csw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert workout log sets" on public.workout_log_sets;
create policy "Coaches can insert workout log sets"
  on public.workout_log_sets for insert
  with check (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = scheduled_workout_id
        and csw.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update workout log sets" on public.workout_log_sets;
create policy "Coaches can update workout log sets"
  on public.workout_log_sets for update
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

drop policy if exists "Coaches can delete workout log sets" on public.workout_log_sets;
create policy "Coaches can delete workout log sets"
  on public.workout_log_sets for delete
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      where csw.id = scheduled_workout_id
        and csw.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can view their workout log sets" on public.workout_log_sets;
create policy "Clients can view their workout log sets"
  on public.workout_log_sets for select
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      join public.clients c on c.id = csw.client_id
      where csw.id = scheduled_workout_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their workout log sets" on public.workout_log_sets;
create policy "Clients can insert their workout log sets"
  on public.workout_log_sets for insert
  with check (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      join public.clients c on c.id = csw.client_id
      where csw.id = scheduled_workout_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can update their workout log sets" on public.workout_log_sets;
create policy "Clients can update their workout log sets"
  on public.workout_log_sets for update
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      join public.clients c on c.id = csw.client_id
      where csw.id = scheduled_workout_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      join public.clients c on c.id = csw.client_id
      where csw.id = scheduled_workout_id
        and c.user_id = auth.uid()
    )
  );
