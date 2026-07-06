-- Per-client progressive overload toggle (migration 0106)

alter table public.clients
  add column if not exists progressive_overload_enabled boolean not null default false;

comment on column public.clients.progressive_overload_enabled is
  'When true, completed sessions may generate load-increase suggestions for this client.';

update public.clients c
set progressive_overload_enabled = true
where exists (
  select 1
  from public.client_scheduled_workouts w
  join public.scheduled_workout_exercises e on e.scheduled_workout_id = w.id
  where w.client_id = c.id
    and coalesce((e.tracking_options->>'autoProgressLoad')::boolean, false) = true
);
