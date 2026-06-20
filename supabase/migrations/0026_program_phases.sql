-- Program phases: named blocks within a program (hypertrophy, strength, peaking, etc.)

create table if not exists public.program_phases (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  description text,
  start_day_offset integer not null check (start_day_offset >= 0 and start_day_offset <= 364),
  end_day_offset integer not null check (end_day_offset >= 0 and end_day_offset <= 364),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint program_phases_day_range_check check (start_day_offset <= end_day_offset)
);

create index if not exists program_phases_coach_id_idx
  on public.program_phases (coach_id);
create index if not exists program_phases_program_id_idx
  on public.program_phases (program_id);
create index if not exists program_phases_program_sort_idx
  on public.program_phases (program_id, sort_order);

drop trigger if exists program_phases_set_updated_at on public.program_phases;
create trigger program_phases_set_updated_at
  before update on public.program_phases
  for each row execute function public.set_updated_at();

alter table public.program_phases enable row level security;

drop policy if exists "Coaches can view their program phases" on public.program_phases;
create policy "Coaches can view their program phases"
  on public.program_phases for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their program phases" on public.program_phases;
create policy "Coaches can insert their program phases"
  on public.program_phases for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their program phases" on public.program_phases;
create policy "Coaches can update their program phases"
  on public.program_phases for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their program phases" on public.program_phases;
create policy "Coaches can delete their program phases"
  on public.program_phases for delete
  using (auth.uid() = coach_id);
