-- Adds is_coach_self to clients for coach personal workout calendar.
-- Run if My Workouts fails with missing column errors.

alter table public.clients
  add column if not exists is_coach_self boolean not null default false;

create unique index if not exists clients_coach_self_unique_idx
  on public.clients (coach_id)
  where is_coach_self = true;
