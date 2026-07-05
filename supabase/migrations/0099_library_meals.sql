-- Coach meal library: reusable individual meals with food line items

-- ---------------------------------------------------------------------------
-- library_meals
-- ---------------------------------------------------------------------------

create table if not exists public.library_meals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  meal_type public.meal_type not null default 'other',
  status public.exercise_status not null default 'active',
  calories_kcal numeric(8, 1) check (calories_kcal is null or calories_kcal >= 0),
  protein_g numeric(8, 1) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8, 1) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(8, 1) check (fat_g is null or fat_g >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists library_meals_coach_id_idx
  on public.library_meals (coach_id);

create index if not exists library_meals_coach_meal_type_idx
  on public.library_meals (coach_id, meal_type);

create index if not exists library_meals_coach_status_idx
  on public.library_meals (coach_id, status);

create index if not exists library_meals_coach_calories_idx
  on public.library_meals (coach_id, calories_kcal);

drop trigger if exists library_meals_set_updated_at on public.library_meals;
create trigger library_meals_set_updated_at
  before update on public.library_meals
  for each row execute function public.set_updated_at();

alter table public.library_meals enable row level security;

drop policy if exists "Coaches can view their library meals" on public.library_meals;
create policy "Coaches can view their library meals"
  on public.library_meals for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their library meals" on public.library_meals;
create policy "Coaches can insert their library meals"
  on public.library_meals for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their library meals" on public.library_meals;
create policy "Coaches can update their library meals"
  on public.library_meals for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete their library meals" on public.library_meals;
create policy "Coaches can delete their library meals"
  on public.library_meals for delete
  using (auth.uid() = coach_id);

comment on table public.library_meals is
  'Coach-owned reusable meal templates for building meal plans.';

-- ---------------------------------------------------------------------------
-- library_meal_foods
-- ---------------------------------------------------------------------------

create table if not exists public.library_meal_foods (
  id uuid primary key default gen_random_uuid(),
  library_meal_id uuid not null references public.library_meals (id) on delete cascade,
  sort_order smallint not null default 0,
  food_name text not null,
  source public.food_source not null default 'custom',
  external_id text,
  quantity_g numeric(8, 1) not null check (quantity_g > 0),
  calories_kcal numeric(8, 1) check (calories_kcal is null or calories_kcal >= 0),
  protein_g numeric(8, 1) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8, 1) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(8, 1) check (fat_g is null or fat_g >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists library_meal_foods_meal_id_idx
  on public.library_meal_foods (library_meal_id);

drop trigger if exists library_meal_foods_set_updated_at on public.library_meal_foods;
create trigger library_meal_foods_set_updated_at
  before update on public.library_meal_foods
  for each row execute function public.set_updated_at();

alter table public.library_meal_foods enable row level security;

drop policy if exists "Coaches can view their library meal foods" on public.library_meal_foods;
create policy "Coaches can view their library meal foods"
  on public.library_meal_foods for select
  using (
    exists (
      select 1
      from public.library_meals lm
      where lm.id = library_meal_id
        and lm.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert their library meal foods" on public.library_meal_foods;
create policy "Coaches can insert their library meal foods"
  on public.library_meal_foods for insert
  with check (
    exists (
      select 1
      from public.library_meals lm
      where lm.id = library_meal_id
        and lm.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update their library meal foods" on public.library_meal_foods;
create policy "Coaches can update their library meal foods"
  on public.library_meal_foods for update
  using (
    exists (
      select 1
      from public.library_meals lm
      where lm.id = library_meal_id
        and lm.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.library_meals lm
      where lm.id = library_meal_id
        and lm.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete their library meal foods" on public.library_meal_foods;
create policy "Coaches can delete their library meal foods"
  on public.library_meal_foods for delete
  using (
    exists (
      select 1
      from public.library_meals lm
      where lm.id = library_meal_id
        and lm.coach_id = auth.uid()
    )
  );

comment on table public.library_meal_foods is
  'Food line items that compose a library meal, with scaled macro snapshots.';
