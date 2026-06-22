-- Client wearable connections and daily metric snapshots (provider-agnostic foundation)

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wearable_provider') then
    create type public.wearable_provider as enum (
      'whoop',
      'garmin',
      'oura',
      'apple_health',
      'fitbit'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wearable_connection_status') then
    create type public.wearable_connection_status as enum (
      'pending',
      'connected',
      'disconnected',
      'error'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- client_wearable_connections
-- ---------------------------------------------------------------------------

create table if not exists public.client_wearable_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  provider public.wearable_provider not null,
  status public.wearable_connection_status not null default 'pending',
  external_user_id text,
  display_name text,
  last_synced_at timestamptz,
  sync_error text,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id, provider)
);

create index if not exists client_wearable_connections_coach_id_idx
  on public.client_wearable_connections (coach_id);
create index if not exists client_wearable_connections_client_id_idx
  on public.client_wearable_connections (client_id);
create index if not exists client_wearable_connections_status_idx
  on public.client_wearable_connections (status);

drop trigger if exists client_wearable_connections_set_updated_at on public.client_wearable_connections;
create trigger client_wearable_connections_set_updated_at
  before update on public.client_wearable_connections
  for each row execute function public.set_updated_at();

alter table public.client_wearable_connections enable row level security;

-- ---------------------------------------------------------------------------
-- client_wearable_daily_metrics
-- ---------------------------------------------------------------------------

create table if not exists public.client_wearable_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  connection_id uuid references public.client_wearable_connections (id) on delete set null,
  provider public.wearable_provider not null,
  metric_date date not null,
  steps integer,
  sleep_hours numeric(4, 2),
  sleep_score integer,
  hrv_ms numeric(6, 2),
  resting_hr_bpm integer,
  recovery_score integer,
  strain_score numeric(4, 1),
  calories_kcal integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (client_id, provider, metric_date)
);

create index if not exists client_wearable_daily_metrics_coach_id_idx
  on public.client_wearable_daily_metrics (coach_id);
create index if not exists client_wearable_daily_metrics_client_id_idx
  on public.client_wearable_daily_metrics (client_id);
create index if not exists client_wearable_daily_metrics_metric_date_idx
  on public.client_wearable_daily_metrics (metric_date desc);

drop trigger if exists client_wearable_daily_metrics_set_updated_at on public.client_wearable_daily_metrics;
create trigger client_wearable_daily_metrics_set_updated_at
  before update on public.client_wearable_daily_metrics
  for each row execute function public.set_updated_at();

alter table public.client_wearable_daily_metrics enable row level security;

-- ---------------------------------------------------------------------------
-- Coach policies — connections
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client wearable connections" on public.client_wearable_connections;
create policy "Coaches can view their client wearable connections"
  on public.client_wearable_connections for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert client wearable connections" on public.client_wearable_connections;
create policy "Coaches can insert client wearable connections"
  on public.client_wearable_connections for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update client wearable connections" on public.client_wearable_connections;
create policy "Coaches can update client wearable connections"
  on public.client_wearable_connections for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete client wearable connections" on public.client_wearable_connections;
create policy "Coaches can delete client wearable connections"
  on public.client_wearable_connections for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- Client policies — connections
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can view their wearable connections" on public.client_wearable_connections;
create policy "Clients can view their wearable connections"
  on public.client_wearable_connections for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their wearable connections" on public.client_wearable_connections;
create policy "Clients can insert their wearable connections"
  on public.client_wearable_connections for insert
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );

drop policy if exists "Clients can update their wearable connections" on public.client_wearable_connections;
create policy "Clients can update their wearable connections"
  on public.client_wearable_connections for update
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );

drop policy if exists "Clients can delete their wearable connections" on public.client_wearable_connections;
create policy "Clients can delete their wearable connections"
  on public.client_wearable_connections for delete
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Coach policies — daily metrics
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client wearable metrics" on public.client_wearable_daily_metrics;
create policy "Coaches can view their client wearable metrics"
  on public.client_wearable_daily_metrics for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert client wearable metrics" on public.client_wearable_daily_metrics;
create policy "Coaches can insert client wearable metrics"
  on public.client_wearable_daily_metrics for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update client wearable metrics" on public.client_wearable_daily_metrics;
create policy "Coaches can update client wearable metrics"
  on public.client_wearable_daily_metrics for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete client wearable metrics" on public.client_wearable_daily_metrics;
create policy "Coaches can delete client wearable metrics"
  on public.client_wearable_daily_metrics for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- Client policies — daily metrics (read-only)
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can view their wearable metrics" on public.client_wearable_daily_metrics;
create policy "Clients can view their wearable metrics"
  on public.client_wearable_daily_metrics for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );
