-- Client accounts: link clients to auth users via coach invites

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('coach', 'client');
  end if;
  if not exists (select 1 from pg_type where typname = 'client_invite_status') then
    create type public.client_invite_status as enum ('not_invited', 'pending', 'accepted');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- profiles.role
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role public.user_role not null default 'coach';

-- ---------------------------------------------------------------------------
-- clients: auth link + invite fields
-- ---------------------------------------------------------------------------

alter table public.clients
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists invite_status public.client_invite_status not null default 'not_invited',
  add column if not exists invite_token uuid unique,
  add column if not exists invite_expires_at timestamptz;

create unique index if not exists clients_user_id_unique_idx
  on public.clients (user_id)
  where user_id is not null;

create index if not exists clients_invite_token_idx
  on public.clients (invite_token)
  where invite_token is not null;

-- ---------------------------------------------------------------------------
-- Link invite to a newly registered auth user
-- ---------------------------------------------------------------------------

create or replace function public.link_client_invite(
  p_token uuid,
  p_user_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
begin
  select *
  into v_client
  from public.clients
  where invite_token = p_token
    and invite_status = 'pending'
    and (invite_expires_at is null or invite_expires_at > timezone('utc', now()))
  for update;

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if v_client.email is null or lower(trim(v_client.email)) <> lower(trim(p_email)) then
    raise exception 'Invite email does not match signup email';
  end if;

  update public.clients
  set
    user_id = p_user_id,
    invite_status = 'accepted',
    invite_token = null,
    invite_expires_at = null
  where id = v_client.id;

  update public.profiles
  set role = 'client'
  where id = p_user_id;

  return v_client.id;
end;
$$;

-- Public preview for signup page (safe fields only)
create or replace function public.get_client_invite_preview(p_token uuid)
returns table (
  client_name text,
  coach_name text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    c.full_name as client_name,
    coalesce(p.full_name, 'Your coach') as coach_name,
    c.email as email
  from public.clients c
  join public.profiles p on p.id = c.coach_id
  where c.invite_token = p_token
    and c.invite_status = 'pending'
    and (c.invite_expires_at is null or c.invite_expires_at > timezone('utc', now()));
end;
$$;

-- ---------------------------------------------------------------------------
-- Auto-create profile + accept invite from signup metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_token uuid;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'coach'::public.user_role);

  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_role)
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = excluded.role;

  begin
    v_token := (new.raw_user_meta_data ->> 'invite_token')::uuid;
  exception
    when invalid_text_representation then
      v_token := null;
  end;

  if v_token is not null then
    perform public.link_client_invite(v_token, new.id, new.email);
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: clients can read their own linked record
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can view their own record" on public.clients;
create policy "Clients can view their own record"
  on public.clients for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant execute on function public.get_client_invite_preview(uuid) to anon, authenticated;
grant execute on function public.link_client_invite(uuid, uuid, text) to authenticated;
