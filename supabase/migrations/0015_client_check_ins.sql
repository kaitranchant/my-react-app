-- Client check-ins: weekly metrics and coach review

-- ---------------------------------------------------------------------------
-- check_in_submitted_by enum
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'check_in_submitted_by') then
    create type public.check_in_submitted_by as enum ('client', 'coach');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- client_check_ins
-- ---------------------------------------------------------------------------

create table if not exists public.client_check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  check_in_date date not null,
  weight numeric(6, 2) check (weight is null or weight >= 0),
  sleep_hours numeric(4, 1) check (sleep_hours is null or sleep_hours >= 0),
  stress_level smallint check (stress_level is null or (stress_level >= 1 and stress_level <= 5)),
  energy_level smallint check (energy_level is null or (energy_level >= 1 and energy_level <= 5)),
  client_notes text,
  coach_notes text,
  submitted_by public.check_in_submitted_by not null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_check_ins_client_date_key unique (client_id, check_in_date)
);

create index if not exists client_check_ins_coach_id_idx
  on public.client_check_ins (coach_id);
create index if not exists client_check_ins_client_id_idx
  on public.client_check_ins (client_id);
create index if not exists client_check_ins_check_in_date_idx
  on public.client_check_ins (check_in_date desc);

drop trigger if exists client_check_ins_set_updated_at on public.client_check_ins;
create trigger client_check_ins_set_updated_at
  before update on public.client_check_ins
  for each row execute function public.set_updated_at();

alter table public.client_check_ins enable row level security;

-- ---------------------------------------------------------------------------
-- Coach policies
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client check-ins" on public.client_check_ins;
create policy "Coaches can view their client check-ins"
  on public.client_check_ins for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert client check-ins" on public.client_check_ins;
create policy "Coaches can insert client check-ins"
  on public.client_check_ins for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update client check-ins" on public.client_check_ins;
create policy "Coaches can update client check-ins"
  on public.client_check_ins for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete client check-ins" on public.client_check_ins;
create policy "Coaches can delete client check-ins"
  on public.client_check_ins for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- Client policies
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can view their check-ins" on public.client_check_ins;
create policy "Clients can view their check-ins"
  on public.client_check_ins for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their check-ins" on public.client_check_ins;
create policy "Clients can insert their check-ins"
  on public.client_check_ins for insert
  with check (
    submitted_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );

drop policy if exists "Clients can update their check-ins" on public.client_check_ins;
create policy "Clients can update their check-ins"
  on public.client_check_ins for update
  using (
    submitted_by = 'client'
    and reviewed_at is null
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    submitted_by = 'client'
    and reviewed_at is null
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_check_ins is
  'Weekly client check-in metrics with optional coach review notes.';
