-- Food library: catalog-backed meal foods and diary references

do $$
begin
  if not exists (select 1 from pg_type where typname = 'food_source') then
    create type public.food_source as enum ('usda', 'custom');
  end if;
end $$;

create table if not exists public.meal_plan_meal_foods (
  id uuid primary key default gen_random_uuid(),
  meal_plan_meal_id uuid not null references public.meal_plan_meals (id) on delete cascade,
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

create index if not exists meal_plan_meal_foods_meal_id_idx
  on public.meal_plan_meal_foods (meal_plan_meal_id);

drop trigger if exists meal_plan_meal_foods_set_updated_at on public.meal_plan_meal_foods;
create trigger meal_plan_meal_foods_set_updated_at
  before update on public.meal_plan_meal_foods
  for each row execute function public.set_updated_at();

alter table public.meal_plan_meal_foods enable row level security;

drop policy if exists "Coaches can view their meal plan meal foods" on public.meal_plan_meal_foods;
create policy "Coaches can view their meal plan meal foods"
  on public.meal_plan_meal_foods for select
  using (
    exists (
      select 1
      from public.meal_plan_meals mpm
      join public.meal_plan_days mpd on mpd.id = mpm.meal_plan_day_id
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpm.id = meal_plan_meal_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can insert their meal plan meal foods" on public.meal_plan_meal_foods;
create policy "Coaches can insert their meal plan meal foods"
  on public.meal_plan_meal_foods for insert
  with check (
    exists (
      select 1
      from public.meal_plan_meals mpm
      join public.meal_plan_days mpd on mpd.id = mpm.meal_plan_day_id
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpm.id = meal_plan_meal_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update their meal plan meal foods" on public.meal_plan_meal_foods;
create policy "Coaches can update their meal plan meal foods"
  on public.meal_plan_meal_foods for update
  using (
    exists (
      select 1
      from public.meal_plan_meals mpm
      join public.meal_plan_days mpd on mpd.id = mpm.meal_plan_day_id
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpm.id = meal_plan_meal_id
        and mp.coach_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.meal_plan_meals mpm
      join public.meal_plan_days mpd on mpd.id = mpm.meal_plan_day_id
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpm.id = meal_plan_meal_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete their meal plan meal foods" on public.meal_plan_meal_foods;
create policy "Coaches can delete their meal plan meal foods"
  on public.meal_plan_meal_foods for delete
  using (
    exists (
      select 1
      from public.meal_plan_meals mpm
      join public.meal_plan_days mpd on mpd.id = mpm.meal_plan_day_id
      join public.meal_plans mp on mp.id = mpd.meal_plan_id
      where mpm.id = meal_plan_meal_id
        and mp.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can view assigned meal plan meal foods" on public.meal_plan_meal_foods;
create policy "Clients can view assigned meal plan meal foods"
  on public.meal_plan_meal_foods for select
  using (
    exists (
      select 1
      from public.meal_plan_meals mpm
      join public.meal_plan_days mpd on mpd.id = mpm.meal_plan_day_id
      join public.meal_plan_assignments mpa on mpa.meal_plan_id = mpd.meal_plan_id
      join public.clients c on c.id = mpa.client_id
      where mpm.id = meal_plan_meal_id
        and c.user_id = auth.uid()
        and mpa.status = 'active'
    )
  );

alter table public.client_food_diary_entries
  add column if not exists source public.food_source,
  add column if not exists external_id text,
  add column if not exists quantity_g numeric(8, 1) check (quantity_g is null or quantity_g > 0);
