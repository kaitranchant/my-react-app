-- Nutrition: macro targets, daily adherence logs, meal plan library + assignments

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'meal_plan_status') then
    create type public.meal_plan_status as enum ('draft', 'active', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'meal_plan_assignment_status') then
    create type public.meal_plan_assignment_status as enum ('active', 'completed', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'meal_type') then
    create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack', 'other');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- client_nutrition_profiles
-- ---------------------------------------------------------------------------

create table if not exists public.client_nutrition_profiles (
  client_id uuid primary key references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  calories_kcal numeric(8, 1) check (calories_kcal is null or calories_kcal > 0),
  protein_g numeric(8, 1) check (protein_g is null or protein_g > 0),
  carbs_g numeric(8, 1) check (carbs_g is null or carbs_g > 0),
  fat_g numeric(8, 1) check (fat_g is null or fat_g > 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_nutrition_profiles_coach_id_idx
  on public.client_nutrition_profiles (coach_id);

drop trigger if exists client_nutrition_profiles_set_updated_at on public.client_nutrition_profiles;
create trigger client_nutrition_profiles_set_updated_at
  before update on public.client_nutrition_profiles
  for each row execute function public.set_updated_at();

alter table public.client_nutrition_profiles enable row level security;

drop policy if exists "Coaches can view client nutrition profiles" on public.client_nutrition_profiles;
create policy "Coaches can view client nutrition profiles"
  on public.client_nutrition_profiles for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client nutrition profiles" on public.client_nutrition_profiles;
create policy "Coaches can insert client nutrition profiles"
  on public.client_nutrition_profiles for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update client nutrition profiles" on public.client_nutrition_profiles;
create policy "Coaches can update client nutrition profiles"
  on public.client_nutrition_profiles for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete client nutrition profiles" on public.client_nutrition_profiles;
create policy "Coaches can delete client nutrition profiles"
  on public.client_nutrition_profiles for delete
  using (public.can_coach_access_client(client_id));

drop policy if exists "Clients can view their nutrition profile" on public.client_nutrition_profiles;
create policy "Clients can view their nutrition profile"
  on public.client_nutrition_profiles for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_nutrition_profiles is
  'Coach-set macro targets and nutrition guidance for a client.';

-- ---------------------------------------------------------------------------
-- client_nutrition_logs
-- ---------------------------------------------------------------------------

create table if not exists public.client_nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  adherence_score smallint not null check (adherence_score >= 1 and adherence_score <= 5),
  client_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_nutrition_logs_client_date_key unique (client_id, log_date)
);

create index if not exists client_nutrition_logs_coach_id_idx
  on public.client_nutrition_logs (coach_id);
create index if not exists client_nutrition_logs_client_id_idx
  on public.client_nutrition_logs (client_id);
create index if not exists client_nutrition_logs_log_date_idx
  on public.client_nutrition_logs (log_date desc);

drop trigger if exists client_nutrition_logs_set_updated_at on public.client_nutrition_logs;
create trigger client_nutrition_logs_set_updated_at
  before update on public.client_nutrition_logs
  for each row execute function public.set_updated_at();

alter table public.client_nutrition_logs enable row level security;

drop policy if exists "Coaches can view client nutrition logs" on public.client_nutrition_logs;
create policy "Coaches can view client nutrition logs"
  on public.client_nutrition_logs for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert client nutrition logs" on public.client_nutrition_logs;
create policy "Coaches can insert client nutrition logs"
  on public.client_nutrition_logs for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update client nutrition logs" on public.client_nutrition_logs;
create policy "Coaches can update client nutrition logs"
  on public.client_nutrition_logs for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete client nutrition logs" on public.client_nutrition_logs;
create policy "Coaches can delete client nutrition logs"
  on public.client_nutrition_logs for delete
  using (auth.uid() = coach_id);

drop policy if exists "Clients can view their nutrition logs" on public.client_nutrition_logs;
create policy "Clients can view their nutrition logs"
  on public.client_nutrition_logs for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their nutrition logs" on public.client_nutrition_logs;
create policy "Clients can insert their nutrition logs"
  on public.client_nutrition_logs for insert
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );

drop policy if exists "Clients can update their nutrition logs" on public.client_nutrition_logs;
create policy "Clients can update their nutrition logs"
  on public.client_nutrition_logs for update
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

comment on table public.client_nutrition_logs is
  'Daily client nutrition adherence scores (1-5).';

-- ---------------------------------------------------------------------------
-- meal_plans
-- ---------------------------------------------------------------------------

create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  status public.meal_plan_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists meal_plans_coach_id_idx on public.meal_plans (coach_id);
create index if not exists meal_plans_status_idx on public.meal_plans (status);

drop trigger if exists meal_plans_set_updated_at on public.meal_plans;
create trigger meal_plans_set_updated_at
  before update on public.meal_plans
  for each row execute function public.set_updated_at();

alter table public.meal_plans enable row level security;

drop policy if exists "Coaches can view their meal plans" on public.meal_plans;
create policy "Coaches can view their meal plans"
  on public.meal_plans for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their meal plans" on public.meal_plans;
create policy "Coaches can insert their meal plans"
  on public.meal_plans for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their meal plans" on public.meal_plans;
create policy "Coaches can update their meal plans"
  on public.meal_plans for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their meal plans" on public.meal_plans;
create policy "Coaches can delete their meal plans"
  on public.meal_plans for delete
  using (auth.uid() = coach_id);

comment on table public.meal_plans is
  'Coach-owned reusable meal plan templates.';

-- ---------------------------------------------------------------------------
-- meal_plan_days
-- ---------------------------------------------------------------------------

create table if not exists public.meal_plan_days (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  day_offset integer not null check (day_offset >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint meal_plan_days_plan_offset_key unique (meal_plan_id, day_offset)
);

create index if not exists meal_plan_days_meal_plan_id_idx
  on public.meal_plan_days (meal_plan_id);

drop trigger if exists meal_plan_days_set_updated_at on public.meal_plan_days;
create trigger meal_plan_days_set_updated_at
  before update on public.meal_plan_days
  for each row execute function public.set_updated_at();

alter table public.meal_plan_days enable row level security;

drop policy if exists "Coaches can view their meal plan days" on public.meal_plan_days;
create policy "Coaches can view their meal plan days"
  on public.meal_plan_days for select
  using (
    exists (
      select 1
      from public.meal_plans mp
      where mp.id = meal_plan_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert their meal plan days" on public.meal_plan_days;
create policy "Coaches can insert their meal plan days"
  on public.meal_plan_days for insert
  with check (
    exists (
      select 1
      from public.meal_plans mp
      where mp.id = meal_plan_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update their meal plan days" on public.meal_plan_days;
create policy "Coaches can update their meal plan days"
  on public.meal_plan_days for update
  using (
    exists (
      select 1
      from public.meal_plans mp
      where mp.id = meal_plan_id
        and mp.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.meal_plans mp
      where mp.id = meal_plan_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete their meal plan days" on public.meal_plan_days;
create policy "Coaches can delete their meal plan days"
  on public.meal_plan_days for delete
  using (
    exists (
      select 1
      from public.meal_plans mp
      where mp.id = meal_plan_id
        and mp.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- meal_plan_meals
-- ---------------------------------------------------------------------------

create table if not exists public.meal_plan_meals (
  id uuid primary key default gen_random_uuid(),
  meal_plan_day_id uuid not null references public.meal_plan_days (id) on delete cascade,
  sort_order smallint not null default 0,
  meal_type public.meal_type not null default 'other',
  name text not null,
  description text,
  calories_kcal numeric(8, 1) check (calories_kcal is null or calories_kcal >= 0),
  protein_g numeric(8, 1) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8, 1) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(8, 1) check (fat_g is null or fat_g >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists meal_plan_meals_day_id_idx
  on public.meal_plan_meals (meal_plan_day_id);

drop trigger if exists meal_plan_meals_set_updated_at on public.meal_plan_meals;
create trigger meal_plan_meals_set_updated_at
  before update on public.meal_plan_meals
  for each row execute function public.set_updated_at();

alter table public.meal_plan_meals enable row level security;

drop policy if exists "Coaches can view their meal plan meals" on public.meal_plan_meals;
create policy "Coaches can view their meal plan meals"
  on public.meal_plan_meals for select
  using (
    exists (
      select 1
      from public.meal_plan_days mpd
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpd.id = meal_plan_day_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert their meal plan meals" on public.meal_plan_meals;
create policy "Coaches can insert their meal plan meals"
  on public.meal_plan_meals for insert
  with check (
    exists (
      select 1
      from public.meal_plan_days mpd
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpd.id = meal_plan_day_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update their meal plan meals" on public.meal_plan_meals;
create policy "Coaches can update their meal plan meals"
  on public.meal_plan_meals for update
  using (
    exists (
      select 1
      from public.meal_plan_days mpd
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpd.id = meal_plan_day_id
        and mp.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.meal_plan_days mpd
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpd.id = meal_plan_day_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete their meal plan meals" on public.meal_plan_meals;
create policy "Coaches can delete their meal plan meals"
  on public.meal_plan_meals for delete
  using (
    exists (
      select 1
      from public.meal_plan_days mpd
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpd.id = meal_plan_day_id
        and mp.coach_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- meal_plan_assignments
-- ---------------------------------------------------------------------------

create table if not exists public.meal_plan_assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  status public.meal_plan_assignment_status not null default 'active',
  team_id uuid references public.teams (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists meal_plan_assignments_coach_id_idx
  on public.meal_plan_assignments (coach_id);
create index if not exists meal_plan_assignments_client_id_idx
  on public.meal_plan_assignments (client_id);
create index if not exists meal_plan_assignments_meal_plan_id_idx
  on public.meal_plan_assignments (meal_plan_id);

create unique index if not exists meal_plan_assignments_active_client_idx
  on public.meal_plan_assignments (client_id)
  where status = 'active';

drop trigger if exists meal_plan_assignments_set_updated_at on public.meal_plan_assignments;
create trigger meal_plan_assignments_set_updated_at
  before update on public.meal_plan_assignments
  for each row execute function public.set_updated_at();

alter table public.meal_plan_assignments enable row level security;

drop policy if exists "Coaches can view their meal plan assignments" on public.meal_plan_assignments;
create policy "Coaches can view their meal plan assignments"
  on public.meal_plan_assignments for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their meal plan assignments" on public.meal_plan_assignments;
create policy "Coaches can insert their meal plan assignments"
  on public.meal_plan_assignments for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their meal plan assignments" on public.meal_plan_assignments;
create policy "Coaches can update their meal plan assignments"
  on public.meal_plan_assignments for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their meal plan assignments" on public.meal_plan_assignments;
create policy "Coaches can delete their meal plan assignments"
  on public.meal_plan_assignments for delete
  using (auth.uid() = coach_id);

drop policy if exists "Clients can view their meal plan assignments" on public.meal_plan_assignments;
create policy "Clients can view their meal plan assignments"
  on public.meal_plan_assignments for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can view assigned meal plans" on public.meal_plans;
create policy "Clients can view assigned meal plans"
  on public.meal_plans for select
  using (
    exists (
      select 1
      from public.meal_plan_assignments mpa
      join public.clients c on c.id = mpa.client_id
      where mpa.meal_plan_id = meal_plans.id
        and c.user_id = auth.uid()
        and mpa.status = 'active'
    )
  );

drop policy if exists "Clients can view assigned meal plan days" on public.meal_plan_days;
create policy "Clients can view assigned meal plan days"
  on public.meal_plan_days for select
  using (
    exists (
      select 1
      from public.meal_plan_assignments mpa
      join public.clients c on c.id = mpa.client_id
      where mpa.meal_plan_id = meal_plan_days.meal_plan_id
        and c.user_id = auth.uid()
        and mpa.status = 'active'
    )
  );

drop policy if exists "Clients can view assigned meal plan meals" on public.meal_plan_meals;
create policy "Clients can view assigned meal plan meals"
  on public.meal_plan_meals for select
  using (
    exists (
      select 1
      from public.meal_plan_days mpd
      join public.meal_plan_assignments mpa on mpa.meal_plan_id = mpd.meal_plan_id
      join public.clients c on c.id = mpa.client_id
      where mpd.id = meal_plan_day_id
        and c.user_id = auth.uid()
        and mpa.status = 'active'
    )
  );

comment on table public.meal_plan_assignments is
  'Links a client to an active meal plan template. Days on the plan are labels for sorting meals, not calendar dates.';
