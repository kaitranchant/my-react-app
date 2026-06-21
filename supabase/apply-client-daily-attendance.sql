-- Daily client attendance (migration 0040)
-- Run in Supabase Dashboard → SQL after migrations through 0039

create table if not exists public.client_daily_attendance (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  attendance_date date not null,
  status public.team_event_attendance_status not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_daily_attendance_client_date_key unique (client_id, attendance_date)
);

create index if not exists client_daily_attendance_coach_id_idx
  on public.client_daily_attendance (coach_id);
create index if not exists client_daily_attendance_client_id_idx
  on public.client_daily_attendance (client_id);
create index if not exists client_daily_attendance_date_idx
  on public.client_daily_attendance (attendance_date desc);

drop trigger if exists client_daily_attendance_set_updated_at on public.client_daily_attendance;
create trigger client_daily_attendance_set_updated_at
  before update on public.client_daily_attendance
  for each row execute function public.set_updated_at();

alter table public.client_daily_attendance enable row level security;

drop policy if exists "Coaches can view client daily attendance" on public.client_daily_attendance;
create policy "Coaches can view client daily attendance"
  on public.client_daily_attendance for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client daily attendance" on public.client_daily_attendance;
create policy "Coaches can insert client daily attendance"
  on public.client_daily_attendance for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update client daily attendance" on public.client_daily_attendance;
create policy "Coaches can update client daily attendance"
  on public.client_daily_attendance for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete client daily attendance" on public.client_daily_attendance;
create policy "Coaches can delete client daily attendance"
  on public.client_daily_attendance for delete
  using (public.can_coach_access_client(client_id));

comment on table public.client_daily_attendance is
  'Coach-marked daily client presence (present, absent, excused). Independent of team event attendance.';
