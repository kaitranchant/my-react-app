-- Optional weekly session target tracking for coaching schedule

alter table public.profiles
  add column if not exists weekly_session_targets_enabled boolean not null default false;

alter table public.clients
  add column if not exists weekly_session_target integer
    check (weekly_session_target is null or weekly_session_target > 0);

create table if not exists public.client_weekly_session_targets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  week_start_date date not null,
  target_sessions int not null check (target_sessions > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id, week_start_date)
);

create index if not exists client_weekly_session_targets_coach_week_idx
  on public.client_weekly_session_targets (coach_id, week_start_date);

drop trigger if exists client_weekly_session_targets_set_updated_at
  on public.client_weekly_session_targets;
create trigger client_weekly_session_targets_set_updated_at
  before update on public.client_weekly_session_targets
  for each row execute function public.set_updated_at();

alter table public.client_weekly_session_targets enable row level security;

drop policy if exists "Coaches manage client weekly session targets"
  on public.client_weekly_session_targets;
create policy "Coaches manage client weekly session targets"
  on public.client_weekly_session_targets
  for all
  using (public.can_coach_access_client(client_id))
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

comment on column public.profiles.weekly_session_targets_enabled is
  'When true, coaches can set per-client weekly session targets shown on the schedule calendar.';

comment on column public.clients.weekly_session_target is
  'Standing default number of sessions per week for this client.';

comment on table public.client_weekly_session_targets is
  'Per-week override of a client''s weekly session target on the coach schedule.';
