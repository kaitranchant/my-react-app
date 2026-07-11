-- How many times to multiply the meal plan when building a shopping list.
-- Does not change meal_plan_days; days remain sort labels for meals.

alter table public.meal_plan_assignments
  add column if not exists shopping_list_cycles integer not null default 1;

alter table public.meal_plan_assignments
  drop constraint if exists meal_plan_assignments_shopping_list_cycles_range;

alter table public.meal_plan_assignments
  add constraint meal_plan_assignments_shopping_list_cycles_range
  check (shopping_list_cycles >= 1 and shopping_list_cycles <= 12);

comment on column public.meal_plan_assignments.shopping_list_cycles is
  'Multiplier for shopping-list quantities (plan cycles to buy for). Does not duplicate meal plan days.';

-- Clients may update shopping_list_cycles on their own assignments.
drop policy if exists "Clients can update shopping list cycles on their assignments"
  on public.meal_plan_assignments;
create policy "Clients can update shopping list cycles on their assignments"
  on public.meal_plan_assignments for update
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
