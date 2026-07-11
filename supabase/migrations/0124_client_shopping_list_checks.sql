-- Persist shopping-list checkoffs per meal-plan assignment

create table if not exists public.client_shopping_list_checks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  meal_plan_assignment_id uuid not null
    references public.meal_plan_assignments (id) on delete cascade,
  food_key text not null,
  checked_at timestamptz not null default timezone('utc', now()),
  checked_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint client_shopping_list_checks_assignment_food_key
    unique (meal_plan_assignment_id, food_key),
  constraint client_shopping_list_checks_food_key_nonempty
    check (char_length(trim(food_key)) > 0)
);

create index if not exists client_shopping_list_checks_client_id_idx
  on public.client_shopping_list_checks (client_id);

create index if not exists client_shopping_list_checks_assignment_id_idx
  on public.client_shopping_list_checks (meal_plan_assignment_id);

alter table public.client_shopping_list_checks enable row level security;

drop policy if exists "Coaches can view client shopping list checks"
  on public.client_shopping_list_checks;
create policy "Coaches can view client shopping list checks"
  on public.client_shopping_list_checks for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client shopping list checks"
  on public.client_shopping_list_checks;
create policy "Coaches can insert client shopping list checks"
  on public.client_shopping_list_checks for insert
  with check (
    public.can_coach_access_client(client_id)
    and auth.uid() = checked_by
    and exists (
      select 1
      from public.meal_plan_assignments mpa
      where mpa.id = meal_plan_assignment_id
        and mpa.client_id = client_id
    )
  );

drop policy if exists "Coaches can delete client shopping list checks"
  on public.client_shopping_list_checks;
create policy "Coaches can delete client shopping list checks"
  on public.client_shopping_list_checks for delete
  using (public.can_coach_access_client(client_id));

drop policy if exists "Clients can view their shopping list checks"
  on public.client_shopping_list_checks;
create policy "Clients can view their shopping list checks"
  on public.client_shopping_list_checks for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their shopping list checks"
  on public.client_shopping_list_checks;
create policy "Clients can insert their shopping list checks"
  on public.client_shopping_list_checks for insert
  with check (
    auth.uid() = checked_by
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.meal_plan_assignments mpa
      where mpa.id = meal_plan_assignment_id
        and mpa.client_id = client_id
    )
  );

drop policy if exists "Clients can delete their shopping list checks"
  on public.client_shopping_list_checks;
create policy "Clients can delete their shopping list checks"
  on public.client_shopping_list_checks for delete
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_shopping_list_checks is
  'Checked-off shopping list items for a client meal plan assignment.';
