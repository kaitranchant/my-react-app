-- Program calendar: schedule workouts on program days (day_offset from program start)

-- ---------------------------------------------------------------------------
-- program_scheduled_workouts
-- ---------------------------------------------------------------------------

create table if not exists public.program_scheduled_workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  day_offset integer not null check (day_offset >= 0),
  name text not null,
  notes text,
  library_workout_id uuid references public.workouts (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint program_scheduled_workouts_program_day_key unique (program_id, day_offset)
);

create index if not exists program_scheduled_workouts_coach_id_idx
  on public.program_scheduled_workouts (coach_id);
create index if not exists program_scheduled_workouts_program_id_idx
  on public.program_scheduled_workouts (program_id);

drop trigger if exists program_scheduled_workouts_set_updated_at on public.program_scheduled_workouts;
create trigger program_scheduled_workouts_set_updated_at
  before update on public.program_scheduled_workouts
  for each row execute function public.set_updated_at();

alter table public.program_scheduled_workouts enable row level security;

drop policy if exists "Coaches can view their program scheduled workouts" on public.program_scheduled_workouts;
create policy "Coaches can view their program scheduled workouts"
  on public.program_scheduled_workouts for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their program scheduled workouts" on public.program_scheduled_workouts;
create policy "Coaches can insert their program scheduled workouts"
  on public.program_scheduled_workouts for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their program scheduled workouts" on public.program_scheduled_workouts;
create policy "Coaches can update their program scheduled workouts"
  on public.program_scheduled_workouts for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their program scheduled workouts" on public.program_scheduled_workouts;
create policy "Coaches can delete their program scheduled workouts"
  on public.program_scheduled_workouts for delete
  using (auth.uid() = coach_id);
