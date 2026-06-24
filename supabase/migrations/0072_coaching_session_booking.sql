-- Coaching session booking: availability, appointments, session packs

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'coaching_appointment_status') then
    create type public.coaching_appointment_status as enum (
      'scheduled',
      'completed',
      'cancelled',
      'no_show'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'coaching_appointment_booked_by') then
    create type public.coaching_appointment_booked_by as enum ('coach', 'client');
  end if;
  if not exists (select 1 from pg_type where typname = 'coach_availability_exception_type') then
    create type public.coach_availability_exception_type as enum ('blocked', 'extra_hours');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Coach booking preferences (profiles)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists session_booking_enabled boolean not null default false,
  add column if not exists default_session_duration_minutes integer not null default 60,
  add column if not exists booking_buffer_minutes integer not null default 15,
  add column if not exists booking_min_notice_hours integer not null default 24,
  add column if not exists booking_max_days_ahead integer not null default 60,
  add column if not exists default_session_location text,
  add column if not exists booking_requires_session_pack boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_default_session_duration_minutes_check;
alter table public.profiles
  add constraint profiles_default_session_duration_minutes_check
  check (default_session_duration_minutes between 15 and 240);

alter table public.profiles
  drop constraint if exists profiles_booking_buffer_minutes_check;
alter table public.profiles
  add constraint profiles_booking_buffer_minutes_check
  check (booking_buffer_minutes between 0 and 120);

alter table public.profiles
  drop constraint if exists profiles_booking_min_notice_hours_check;
alter table public.profiles
  add constraint profiles_booking_min_notice_hours_check
  check (booking_min_notice_hours between 0 and 168);

alter table public.profiles
  drop constraint if exists profiles_booking_max_days_ahead_check;
alter table public.profiles
  add constraint profiles_booking_max_days_ahead_check
  check (booking_max_days_ahead between 1 and 365);

comment on column public.profiles.session_booking_enabled is
  'When true, clients can self-book coaching sessions via the portal.';
comment on column public.profiles.booking_requires_session_pack is
  'When true, clients must have remaining sessions in a pack to book.';

-- ---------------------------------------------------------------------------
-- coach_availability_rules — weekly recurring windows (day 0 = Sunday … 6 = Saturday)
-- ---------------------------------------------------------------------------

create table if not exists public.coach_availability_rules (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_availability_rules_day_of_week_check
    check (day_of_week between 0 and 6),
  constraint coach_availability_rules_time_order_check
    check (start_time < end_time)
);

create index if not exists coach_availability_rules_coach_id_idx
  on public.coach_availability_rules (coach_id);

drop trigger if exists coach_availability_rules_set_updated_at on public.coach_availability_rules;
create trigger coach_availability_rules_set_updated_at
  before update on public.coach_availability_rules
  for each row execute function public.set_updated_at();

alter table public.coach_availability_rules enable row level security;

drop policy if exists "Coaches manage their availability rules" on public.coach_availability_rules;
create policy "Coaches manage their availability rules"
  on public.coach_availability_rules
  for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Clients can view coach availability rules" on public.coach_availability_rules;
create policy "Clients can view coach availability rules"
  on public.coach_availability_rules for select
  using (
    exists (
      select 1
      from public.clients c
      where c.coach_id = coach_availability_rules.coach_id
        and c.user_id = auth.uid()
        and c.invite_status = 'accepted'
    )
  );

-- ---------------------------------------------------------------------------
-- coach_availability_exceptions — blocked days/times or extra hours
-- ---------------------------------------------------------------------------

create table if not exists public.coach_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  exception_date date not null,
  exception_type public.coach_availability_exception_type not null,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_availability_exceptions_time_pair_check
    check (
      (start_time is null and end_time is null)
      or (start_time is not null and end_time is not null and start_time < end_time)
    )
);

create index if not exists coach_availability_exceptions_coach_date_idx
  on public.coach_availability_exceptions (coach_id, exception_date);

drop trigger if exists coach_availability_exceptions_set_updated_at on public.coach_availability_exceptions;
create trigger coach_availability_exceptions_set_updated_at
  before update on public.coach_availability_exceptions
  for each row execute function public.set_updated_at();

alter table public.coach_availability_exceptions enable row level security;

drop policy if exists "Coaches manage their availability exceptions" on public.coach_availability_exceptions;
create policy "Coaches manage their availability exceptions"
  on public.coach_availability_exceptions
  for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Clients can view coach availability exceptions" on public.coach_availability_exceptions;
create policy "Clients can view coach availability exceptions"
  on public.coach_availability_exceptions for select
  using (
    exists (
      select 1
      from public.clients c
      where c.coach_id = coach_availability_exceptions.coach_id
        and c.user_id = auth.uid()
        and c.invite_status = 'accepted'
    )
  );

-- ---------------------------------------------------------------------------
-- client_session_packs — prepaid session credits
-- ---------------------------------------------------------------------------

create table if not exists public.client_session_packs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,
  total_sessions integer not null,
  sessions_used integer not null default 0,
  expires_at date,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_session_packs_total_sessions_check
    check (total_sessions > 0),
  constraint client_session_packs_sessions_used_check
    check (sessions_used >= 0 and sessions_used <= total_sessions)
);

create index if not exists client_session_packs_client_id_idx
  on public.client_session_packs (client_id);
create index if not exists client_session_packs_coach_id_idx
  on public.client_session_packs (coach_id);

drop trigger if exists client_session_packs_set_updated_at on public.client_session_packs;
create trigger client_session_packs_set_updated_at
  before update on public.client_session_packs
  for each row execute function public.set_updated_at();

alter table public.client_session_packs enable row level security;

drop policy if exists "Coaches manage client session packs" on public.client_session_packs;
create policy "Coaches manage client session packs"
  on public.client_session_packs
  for all
  using (public.can_coach_access_client(client_id))
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Clients can view their session packs" on public.client_session_packs;
create policy "Clients can view their session packs"
  on public.client_session_packs for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_session_packs.client_id
        and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- coaching_appointments — 1:1 coaching sessions (distinct from workout calendar)
-- ---------------------------------------------------------------------------

create table if not exists public.coaching_appointments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.coaching_appointment_status not null default 'scheduled',
  location text,
  notes text,
  coaching_type public.client_coaching_type,
  session_pack_id uuid references public.client_session_packs (id) on delete set null,
  booked_by public.coaching_appointment_booked_by not null,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coaching_appointments_time_order_check
    check (starts_at < ends_at)
);

create index if not exists coaching_appointments_coach_starts_idx
  on public.coaching_appointments (coach_id, starts_at);
create index if not exists coaching_appointments_client_starts_idx
  on public.coaching_appointments (client_id, starts_at);
create index if not exists coaching_appointments_status_idx
  on public.coaching_appointments (status)
  where status = 'scheduled';

drop trigger if exists coaching_appointments_set_updated_at on public.coaching_appointments;
create trigger coaching_appointments_set_updated_at
  before update on public.coaching_appointments
  for each row execute function public.set_updated_at();

alter table public.coaching_appointments enable row level security;

drop policy if exists "Coaches manage coaching appointments" on public.coaching_appointments;
create policy "Coaches manage coaching appointments"
  on public.coaching_appointments
  for all
  using (public.can_coach_access_client(client_id))
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Clients can view their coaching appointments" on public.coaching_appointments;
create policy "Clients can view their coaching appointments"
  on public.coaching_appointments for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = coaching_appointments.client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can book coaching appointments" on public.coaching_appointments;
create policy "Clients can book coaching appointments"
  on public.coaching_appointments for insert
  with check (
    booked_by = 'client'
    and exists (
      select 1
      from public.clients c
      join public.profiles p on p.id = c.coach_id
      where c.id = coaching_appointments.client_id
        and c.user_id = auth.uid()
        and c.coach_id = coaching_appointments.coach_id
        and p.session_booking_enabled = true
    )
  );

drop policy if exists "Clients can cancel their coaching appointments" on public.coaching_appointments;
create policy "Clients can cancel their coaching appointments"
  on public.coaching_appointments for update
  using (
    exists (
      select 1
      from public.clients c
      where c.id = coaching_appointments.client_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = coaching_appointments.client_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.coaching_appointments is
  '1:1 coaching session bookings (in-person, online, hybrid). Distinct from client_scheduled_workouts.';
