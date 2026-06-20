-- Coach-set client goals: body composition targets and daily habit reminders

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_category') then
    create type public.client_goal_category as enum ('composition', 'daily');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_direction') then
    create type public.client_goal_direction as enum ('decrease', 'increase');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_goal_comparison') then
    create type public.client_goal_comparison as enum ('at_least', 'at_most');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- client_goals
-- ---------------------------------------------------------------------------

create table if not exists public.client_goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  category public.client_goal_category not null,
  metric text,
  direction public.client_goal_direction,
  target_amount numeric(10, 2),
  title text,
  target_value numeric(10, 2),
  comparison public.client_goal_comparison,
  unit text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint client_goals_composition_fields check (
    (
      category = 'composition'
      and metric is not null
      and direction is not null
      and target_amount is not null
      and target_amount > 0
      and unit is not null
      and target_value is null
      and comparison is null
    )
    or (
      category = 'daily'
      and title is not null
      and trim(title) <> ''
      and target_value is not null
      and target_value > 0
      and comparison is not null
      and unit is not null
      and trim(unit) <> ''
      and metric is null
      and direction is null
      and target_amount is null
    )
  ),
  constraint client_goals_metric_allowed check (
    metric is null
    or metric in (
      'weight_lbs',
      'percent_body_fat',
      'skeletal_muscle_mass_lbs',
      'body_fat_mass_lbs',
      'lean_body_mass_lbs',
      'bmi',
      'total_body_water_lbs',
      'dry_lean_mass_lbs',
      'basal_metabolic_rate_kcal',
      'skeletal_muscle_index'
    )
  )
);

create index if not exists client_goals_client_id_idx
  on public.client_goals (client_id);
create index if not exists client_goals_coach_id_idx
  on public.client_goals (coach_id);
create index if not exists client_goals_client_category_sort_idx
  on public.client_goals (client_id, category, sort_order);

drop trigger if exists client_goals_set_updated_at on public.client_goals;
create trigger client_goals_set_updated_at
  before update on public.client_goals
  for each row execute function public.set_updated_at();

alter table public.client_goals enable row level security;

drop policy if exists "Coaches can view their client goals" on public.client_goals;
create policy "Coaches can view their client goals"
  on public.client_goals for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client goals" on public.client_goals;
create policy "Coaches can insert client goals"
  on public.client_goals for insert
  with check (
    auth.uid() = coach_id
    and public.can_coach_access_client(client_id)
  );

drop policy if exists "Coaches can update client goals" on public.client_goals;
create policy "Coaches can update client goals"
  on public.client_goals for update
  using (public.can_coach_access_client(client_id))
  with check (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can delete client goals" on public.client_goals;
create policy "Coaches can delete client goals"
  on public.client_goals for delete
  using (public.can_coach_access_client(client_id));

drop policy if exists "Clients can view their goals" on public.client_goals;
create policy "Clients can view their goals"
  on public.client_goals for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_goals is
  'Coach-set goals for clients: InBody composition targets and daily habit reminders.';
