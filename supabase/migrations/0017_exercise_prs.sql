-- Exercise personal records: persisted PR history for load analytics

-- ---------------------------------------------------------------------------
-- exercise_pr_record_type enum
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'exercise_pr_record_type') then
    create type public.exercise_pr_record_type as enum ('e1rm', 'top_set');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- exercise_pr_records
-- ---------------------------------------------------------------------------

create table if not exists public.exercise_pr_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete cascade,
  record_type public.exercise_pr_record_type not null,
  e1rm numeric(8, 2) check (e1rm is null or e1rm >= 0),
  weight numeric(8, 2) check (weight is null or weight >= 0),
  reps integer check (reps is null or reps >= 0),
  session_volume numeric(12, 2) check (session_volume is null or session_volume >= 0),
  scheduled_workout_id uuid not null references public.client_scheduled_workouts (id) on delete cascade,
  scheduled_exercise_id uuid not null references public.scheduled_workout_exercises (id) on delete cascade,
  forced boolean not null default false,
  achieved_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists exercise_pr_records_client_exercise_achieved_idx
  on public.exercise_pr_records (client_id, exercise_id, achieved_at desc);
create index if not exists exercise_pr_records_coach_id_idx
  on public.exercise_pr_records (coach_id);
create index if not exists exercise_pr_records_client_id_idx
  on public.exercise_pr_records (client_id);

alter table public.exercise_pr_records enable row level security;

-- ---------------------------------------------------------------------------
-- Coach policies
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view exercise pr records" on public.exercise_pr_records;
create policy "Coaches can view exercise pr records"
  on public.exercise_pr_records for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert exercise pr records" on public.exercise_pr_records;
create policy "Coaches can insert exercise pr records"
  on public.exercise_pr_records for insert
  with check (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- Client policies
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can view their exercise pr records" on public.exercise_pr_records;
create policy "Clients can view their exercise pr records"
  on public.exercise_pr_records for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = exercise_pr_records.client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their exercise pr records" on public.exercise_pr_records;
create policy "Clients can insert their exercise pr records"
  on public.exercise_pr_records for insert
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = exercise_pr_records.client_id
        and c.user_id = auth.uid()
    )
  );
