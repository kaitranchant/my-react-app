-- Client-specific meal plans (nullable client_id = reusable template)

alter table public.meal_plans
  add column if not exists client_id uuid references public.clients (id) on delete cascade;

create index if not exists meal_plans_client_id_idx
  on public.meal_plans (client_id)
  where client_id is not null;

comment on column public.meal_plans.client_id is
  'When set, this meal plan is scoped to a single client rather than a reusable library template.';
