-- Ongoing weekly session series (coach-managed recurring appointments)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'coaching_appointment_series_status') then
    create type public.coaching_appointment_series_status as enum ('active', 'cancelled');
  end if;
end $$;

create table if not exists public.coaching_appointment_series (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  anchor_starts_at timestamptz not null,
  duration_minutes int not null check (duration_minutes > 0),
  status public.coaching_appointment_series_status not null default 'active',
  location text,
  pre_session_notes text,
  coaching_type public.client_coaching_type,
  session_type public.coaching_session_type not null default 'coaching',
  session_pack_id uuid references public.client_session_packs (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists coaching_appointment_series_coach_active_idx
  on public.coaching_appointment_series (coach_id, status)
  where status = 'active';

create index if not exists coaching_appointment_series_client_idx
  on public.coaching_appointment_series (client_id);

drop trigger if exists coaching_appointment_series_set_updated_at
  on public.coaching_appointment_series;
create trigger coaching_appointment_series_set_updated_at
  before update on public.coaching_appointment_series
  for each row execute function public.set_updated_at();

alter table public.coaching_appointment_series enable row level security;

drop policy if exists "Coaches manage coaching appointment series"
  on public.coaching_appointment_series;
create policy "Coaches manage coaching appointment series"
  on public.coaching_appointment_series
  for all
  using (public.can_coach_access_client(client_id))
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Clients can view their coaching appointment series"
  on public.coaching_appointment_series;
create policy "Clients can view their coaching appointment series"
  on public.coaching_appointment_series for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = coaching_appointment_series.client_id
        and c.user_id = auth.uid()
    )
  );

alter table public.coaching_appointments
  add column if not exists series_id uuid
    references public.coaching_appointment_series (id) on delete set null;

create index if not exists coaching_appointments_series_id_idx
  on public.coaching_appointments (series_id)
  where series_id is not null;

comment on table public.coaching_appointment_series is
  'Coach-defined weekly recurring sessions. Appointments are materialized ahead on a rolling horizon.';

comment on column public.coaching_appointments.series_id is
  'When set, this session belongs to an ongoing weekly series.';
