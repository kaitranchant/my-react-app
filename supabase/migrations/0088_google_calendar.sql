-- Google Calendar integration for coaching session scheduling

-- ---------------------------------------------------------------------------
-- coach_google_calendar_connections
-- ---------------------------------------------------------------------------

create table if not exists public.coach_google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  google_email text not null,
  calendar_id text not null default 'primary',
  sync_export_enabled boolean not null default true,
  sync_busy_enabled boolean not null default true,
  connected_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint coach_google_calendar_connections_coach_id_key unique (coach_id)
);

create index if not exists coach_google_calendar_connections_coach_id_idx
  on public.coach_google_calendar_connections (coach_id);

drop trigger if exists coach_google_calendar_connections_set_updated_at
  on public.coach_google_calendar_connections;
create trigger coach_google_calendar_connections_set_updated_at
  before update on public.coach_google_calendar_connections
  for each row execute function public.set_updated_at();

alter table public.coach_google_calendar_connections enable row level security;

drop policy if exists "Coaches manage their Google Calendar connection"
  on public.coach_google_calendar_connections;
create policy "Coaches manage their Google Calendar connection"
  on public.coach_google_calendar_connections
  for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ---------------------------------------------------------------------------
-- coach_google_calendar_secrets — OAuth tokens (service role only)
-- ---------------------------------------------------------------------------

create table if not exists public.coach_google_calendar_secrets (
  connection_id uuid primary key references public.coach_google_calendar_connections (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists coach_google_calendar_secrets_set_updated_at
  on public.coach_google_calendar_secrets;
create trigger coach_google_calendar_secrets_set_updated_at
  before update on public.coach_google_calendar_secrets
  for each row execute function public.set_updated_at();

alter table public.coach_google_calendar_secrets enable row level security;

-- No policies: only service role may read/write tokens.

-- ---------------------------------------------------------------------------
-- coaching_appointments — link to Google Calendar events
-- ---------------------------------------------------------------------------

alter table public.coaching_appointments
  add column if not exists google_calendar_event_id text;

comment on column public.coaching_appointments.google_calendar_event_id is
  'Google Calendar event id when exported via coach Google Calendar sync.';
