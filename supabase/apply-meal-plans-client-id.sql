-- Client-specific meal plans: add client_id to meal_plans
alter table public.meal_plans
  add column if not exists client_id uuid references public.clients (id) on delete cascade;

create index if not exists meal_plans_client_id_idx
  on public.meal_plans (client_id)
  where client_id is not null;
