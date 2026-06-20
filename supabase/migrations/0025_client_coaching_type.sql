-- Client coaching delivery type: online, in-person, or hybrid

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_coaching_type') then
    create type public.client_coaching_type as enum ('online', 'in_person', 'hybrid');
  end if;
end
$$;

alter table public.clients
  add column if not exists coaching_type public.client_coaching_type;
