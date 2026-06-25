-- Nutrition improvements: fiber/water targets, dietary info, food diary, supplements

-- ---------------------------------------------------------------------------
-- Extend client_nutrition_profiles
-- ---------------------------------------------------------------------------

alter table public.client_nutrition_profiles
  add column if not exists fiber_g numeric(8, 1)
    check (fiber_g is null or fiber_g > 0),
  add column if not exists water_ml numeric(8, 1)
    check (water_ml is null or water_ml > 0),
  add column if not exists dietary_restrictions text,
  add column if not exists supplements jsonb not null default '[]'::jsonb,
  add column if not exists client_nutrition_notes text;

comment on column public.client_nutrition_profiles.fiber_g is
  'Daily fiber target in grams.';
comment on column public.client_nutrition_profiles.water_ml is
  'Daily water intake target in milliliters.';
comment on column public.client_nutrition_profiles.dietary_restrictions is
  'Allergies, intolerances, and dietary preferences (e.g. gluten-free, vegan).';
comment on column public.client_nutrition_profiles.supplements is
  'JSON array of supplements: [{ name, dosage, timing }].';
comment on column public.client_nutrition_profiles.client_nutrition_notes is
  'Client-reported nutrition notes (cravings, struggles, actual eating patterns).';

-- ---------------------------------------------------------------------------
-- Extend client_nutrition_logs for daily fiber/water tracking
-- ---------------------------------------------------------------------------

alter table public.client_nutrition_logs
  add column if not exists fiber_g numeric(8, 1)
    check (fiber_g is null or fiber_g >= 0),
  add column if not exists water_ml numeric(8, 1)
    check (water_ml is null or water_ml >= 0);

-- ---------------------------------------------------------------------------
-- client_food_diary_entries
-- ---------------------------------------------------------------------------

create table if not exists public.client_food_diary_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  meal_type public.meal_type not null default 'other',
  food_name text not null,
  calories_kcal numeric(8, 1) check (calories_kcal is null or calories_kcal >= 0),
  protein_g numeric(8, 1) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8, 1) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(8, 1) check (fat_g is null or fat_g >= 0),
  fiber_g numeric(8, 1) check (fiber_g is null or fiber_g >= 0),
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_food_diary_entries_client_date_idx
  on public.client_food_diary_entries (client_id, log_date desc);
create index if not exists client_food_diary_entries_coach_id_idx
  on public.client_food_diary_entries (coach_id);

drop trigger if exists client_food_diary_entries_set_updated_at on public.client_food_diary_entries;
create trigger client_food_diary_entries_set_updated_at
  before update on public.client_food_diary_entries
  for each row execute function public.set_updated_at();

alter table public.client_food_diary_entries enable row level security;

drop policy if exists "Coaches can view client food diary entries" on public.client_food_diary_entries;
create policy "Coaches can view client food diary entries"
  on public.client_food_diary_entries for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert client food diary entries" on public.client_food_diary_entries;
create policy "Coaches can insert client food diary entries"
  on public.client_food_diary_entries for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update client food diary entries" on public.client_food_diary_entries;
create policy "Coaches can update client food diary entries"
  on public.client_food_diary_entries for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete client food diary entries" on public.client_food_diary_entries;
create policy "Coaches can delete client food diary entries"
  on public.client_food_diary_entries for delete
  using (auth.uid() = coach_id);

drop policy if exists "Clients can view their food diary entries" on public.client_food_diary_entries;
create policy "Clients can view their food diary entries"
  on public.client_food_diary_entries for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their food diary entries" on public.client_food_diary_entries;
create policy "Clients can insert their food diary entries"
  on public.client_food_diary_entries for insert
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );

drop policy if exists "Clients can update their food diary entries" on public.client_food_diary_entries;
create policy "Clients can update their food diary entries"
  on public.client_food_diary_entries for update
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
    )
  );

drop policy if exists "Clients can delete their food diary entries" on public.client_food_diary_entries;
create policy "Clients can delete their food diary entries"
  on public.client_food_diary_entries for delete
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

-- Clients can update their nutrition notes on their profile
drop policy if exists "Clients can update their nutrition profile notes" on public.client_nutrition_profiles;
create policy "Clients can update their nutrition profile notes"
  on public.client_nutrition_profiles for update
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
    )
  );

comment on table public.client_food_diary_entries is
  'Client food diary entries grouped by meal type with optional macro breakdown.';
