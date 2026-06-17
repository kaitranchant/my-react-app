-- Programs: coach-owned templates and client assignments

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'program_status') then
    create type public.program_status as enum ('draft', 'active', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'program_assignment_status') then
    create type public.program_assignment_status as enum ('active', 'completed', 'cancelled');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  status public.program_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists programs_coach_id_idx on public.programs (coach_id);
create index if not exists programs_status_idx on public.programs (status);

drop trigger if exists programs_set_updated_at on public.programs;
create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

alter table public.programs enable row level security;

drop policy if exists "Coaches can view their programs" on public.programs;
create policy "Coaches can view their programs"
  on public.programs for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their programs" on public.programs;
create policy "Coaches can insert their programs"
  on public.programs for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their programs" on public.programs;
create policy "Coaches can update their programs"
  on public.programs for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their programs" on public.programs;
create policy "Coaches can delete their programs"
  on public.programs for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- program_assignments
-- ---------------------------------------------------------------------------

create table if not exists public.program_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  status public.program_assignment_status not null default 'active',
  start_date date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists program_assignments_coach_id_idx
  on public.program_assignments (coach_id);
create index if not exists program_assignments_client_id_idx
  on public.program_assignments (client_id);
create index if not exists program_assignments_program_id_idx
  on public.program_assignments (program_id);

create unique index if not exists program_assignments_active_client_idx
  on public.program_assignments (client_id)
  where status = 'active';

drop trigger if exists program_assignments_set_updated_at on public.program_assignments;
create trigger program_assignments_set_updated_at
  before update on public.program_assignments
  for each row execute function public.set_updated_at();

alter table public.program_assignments enable row level security;

drop policy if exists "Coaches can view their program assignments" on public.program_assignments;
create policy "Coaches can view their program assignments"
  on public.program_assignments for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their program assignments" on public.program_assignments;
create policy "Coaches can insert their program assignments"
  on public.program_assignments for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their program assignments" on public.program_assignments;
create policy "Coaches can update their program assignments"
  on public.program_assignments for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their program assignments" on public.program_assignments;
create policy "Coaches can delete their program assignments"
  on public.program_assignments for delete
  using (auth.uid() = coach_id);

drop policy if exists "Clients can view their program assignments" on public.program_assignments;
create policy "Clients can view their program assignments"
  on public.program_assignments for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can view assigned programs" on public.programs;
create policy "Clients can view assigned programs"
  on public.programs for select
  using (
    exists (
      select 1
      from public.program_assignments pa
      join public.clients c on c.id = pa.client_id
      where pa.program_id = programs.id
        and c.user_id = auth.uid()
        and pa.status = 'active'
    )
  );
