-- Client biological sex for Wilks / DOTS scoring (0045)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'biological_sex') then
    create type public.biological_sex as enum ('male', 'female');
  end if;
end $$;

alter table public.clients
  add column if not exists biological_sex public.biological_sex;

comment on column public.clients.biological_sex is
  'Used for Wilks / DOTS relative strength scoring on leaderboards.';
