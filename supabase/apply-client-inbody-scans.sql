-- Client InBody scan results (mirrors 0019_client_inbody_scans.sql)
-- Run in Supabase Dashboard → SQL if not using yarn db:push

-- ---------------------------------------------------------------------------
-- client_inbody_scans
-- ---------------------------------------------------------------------------

create table if not exists public.client_inbody_scans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  scan_date timestamptz not null,
  weight_lbs numeric(6, 2) not null check (weight_lbs >= 0),
  skeletal_muscle_mass_lbs numeric(6, 2) not null check (skeletal_muscle_mass_lbs >= 0),
  percent_body_fat numeric(5, 2) not null check (
    percent_body_fat >= 0
    and percent_body_fat <= 100
  ),
  total_body_water_lbs numeric(6, 2) check (
    total_body_water_lbs is null
    or total_body_water_lbs >= 0
  ),
  dry_lean_mass_lbs numeric(6, 2) check (
    dry_lean_mass_lbs is null
    or dry_lean_mass_lbs >= 0
  ),
  body_fat_mass_lbs numeric(6, 2) check (
    body_fat_mass_lbs is null
    or body_fat_mass_lbs >= 0
  ),
  bmi numeric(5, 2) check (bmi is null or bmi >= 0),
  lean_body_mass_lbs numeric(6, 2) check (
    lean_body_mass_lbs is null
    or lean_body_mass_lbs >= 0
  ),
  basal_metabolic_rate_kcal integer check (
    basal_metabolic_rate_kcal is null
    or basal_metabolic_rate_kcal >= 0
  ),
  skeletal_muscle_index numeric(5, 2) check (
    skeletal_muscle_index is null
    or skeletal_muscle_index >= 0
  ),
  notes text,
  submitted_by public.check_in_submitted_by not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_inbody_scans_coach_id_idx
  on public.client_inbody_scans (coach_id);
create index if not exists client_inbody_scans_client_id_idx
  on public.client_inbody_scans (client_id);
create index if not exists client_inbody_scans_scan_date_idx
  on public.client_inbody_scans (scan_date desc);

drop trigger if exists client_inbody_scans_set_updated_at on public.client_inbody_scans;
create trigger client_inbody_scans_set_updated_at
  before update on public.client_inbody_scans
  for each row execute function public.set_updated_at();

alter table public.client_inbody_scans enable row level security;

drop policy if exists "Coaches can view their client InBody scans" on public.client_inbody_scans;
create policy "Coaches can view their client InBody scans"
  on public.client_inbody_scans for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert client InBody scans" on public.client_inbody_scans;
create policy "Coaches can insert client InBody scans"
  on public.client_inbody_scans for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update client InBody scans" on public.client_inbody_scans;
create policy "Coaches can update client InBody scans"
  on public.client_inbody_scans for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete client InBody scans" on public.client_inbody_scans;
create policy "Coaches can delete client InBody scans"
  on public.client_inbody_scans for delete
  using (auth.uid() = coach_id);

drop policy if exists "Clients can view their InBody scans" on public.client_inbody_scans;
create policy "Clients can view their InBody scans"
  on public.client_inbody_scans for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their InBody scans" on public.client_inbody_scans;
create policy "Clients can insert their InBody scans"
  on public.client_inbody_scans for insert
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

drop policy if exists "Clients can update their InBody scans" on public.client_inbody_scans;
create policy "Clients can update their InBody scans"
  on public.client_inbody_scans for update
  using (
    submitted_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    submitted_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can delete their InBody scans" on public.client_inbody_scans;
create policy "Clients can delete their InBody scans"
  on public.client_inbody_scans for delete
  using (
    submitted_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_inbody_scans is
  'InBody body composition scan results tracked over time for a client.';
