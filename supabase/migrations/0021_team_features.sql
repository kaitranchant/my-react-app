-- Team features: events, announcements, attendance/RSVP, competition tracking

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'team_event_type') then
    create type public.team_event_type as enum (
      'practice',
      'check_in',
      'mock_meet',
      'competition',
      'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'team_event_rsvp_status') then
    create type public.team_event_rsvp_status as enum (
      'going',
      'maybe',
      'declined',
      'no_response'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'team_event_attendance_status') then
    create type public.team_event_attendance_status as enum (
      'present',
      'absent',
      'excused'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- teams: competition context
-- ---------------------------------------------------------------------------

alter table public.teams
  add column if not exists next_competition_name text,
  add column if not exists next_competition_date date;

-- ---------------------------------------------------------------------------
-- team_announcements
-- ---------------------------------------------------------------------------

create table if not exists public.team_announcements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_announcements_team_id_idx
  on public.team_announcements (team_id);

drop trigger if exists team_announcements_set_updated_at on public.team_announcements;
create trigger team_announcements_set_updated_at
  before update on public.team_announcements
  for each row execute function public.set_updated_at();

alter table public.team_announcements enable row level security;

drop policy if exists "Coaches can view their team announcements" on public.team_announcements;
create policy "Coaches can view their team announcements"
  on public.team_announcements for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their team announcements" on public.team_announcements;
create policy "Coaches can insert their team announcements"
  on public.team_announcements for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their team announcements" on public.team_announcements;
create policy "Coaches can update their team announcements"
  on public.team_announcements for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their team announcements" on public.team_announcements;
create policy "Coaches can delete their team announcements"
  on public.team_announcements for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- team_events
-- ---------------------------------------------------------------------------

create table if not exists public.team_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  event_type public.team_event_type not null default 'practice',
  event_date date not null,
  start_time time,
  location text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists team_events_team_id_idx on public.team_events (team_id);
create index if not exists team_events_event_date_idx on public.team_events (event_date);

drop trigger if exists team_events_set_updated_at on public.team_events;
create trigger team_events_set_updated_at
  before update on public.team_events
  for each row execute function public.set_updated_at();

alter table public.team_events enable row level security;

drop policy if exists "Coaches can view their team events" on public.team_events;
create policy "Coaches can view their team events"
  on public.team_events for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their team events" on public.team_events;
create policy "Coaches can insert their team events"
  on public.team_events for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their team events" on public.team_events;
create policy "Coaches can update their team events"
  on public.team_events for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their team events" on public.team_events;
create policy "Coaches can delete their team events"
  on public.team_events for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- team_event_member_status (RSVP + attendance)
-- ---------------------------------------------------------------------------

create table if not exists public.team_event_member_status (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.team_events (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  rsvp_status public.team_event_rsvp_status not null default 'no_response',
  attendance_status public.team_event_attendance_status,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, client_id)
);

create index if not exists team_event_member_status_event_id_idx
  on public.team_event_member_status (event_id);
create index if not exists team_event_member_status_client_id_idx
  on public.team_event_member_status (client_id);

drop trigger if exists team_event_member_status_set_updated_at on public.team_event_member_status;
create trigger team_event_member_status_set_updated_at
  before update on public.team_event_member_status
  for each row execute function public.set_updated_at();

alter table public.team_event_member_status enable row level security;

drop policy if exists "Coaches can view team event member status" on public.team_event_member_status;
create policy "Coaches can view team event member status"
  on public.team_event_member_status for select
  using (
    exists (
      select 1
      from public.team_events e
      where e.id = event_id
        and e.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert team event member status" on public.team_event_member_status;
create policy "Coaches can insert team event member status"
  on public.team_event_member_status for insert
  with check (
    exists (
      select 1
      from public.team_events e
      join public.clients c on c.id = client_id
      where e.id = event_id
        and e.coach_id = auth.uid()
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update team event member status" on public.team_event_member_status;
create policy "Coaches can update team event member status"
  on public.team_event_member_status for update
  using (
    exists (
      select 1
      from public.team_events e
      where e.id = event_id
        and e.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.team_events e
      where e.id = event_id
        and e.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete team event member status" on public.team_event_member_status;
create policy "Coaches can delete team event member status"
  on public.team_event_member_status for delete
  using (
    exists (
      select 1
      from public.team_events e
      where e.id = event_id
        and e.coach_id = auth.uid()
    )
  );
