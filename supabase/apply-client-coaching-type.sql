-- Adds coaching_type (online, in-person, hybrid) to clients.
-- Run if client type saves fail with missing column errors.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_coaching_type') then
    create type public.client_coaching_type as enum ('online', 'in_person', 'hybrid');
  end if;
end
$$;

alter table public.clients
  add column if not exists coaching_type public.client_coaching_type;
