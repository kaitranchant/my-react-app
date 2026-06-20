-- Client messaging: 1:1 coach ↔ client threads

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_sender_role') then
    create type public.message_sender_role as enum ('coach', 'client');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- client_message_threads
-- ---------------------------------------------------------------------------

create table if not exists public.client_message_threads (
  client_id uuid primary key references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  coach_last_read_at timestamptz,
  client_last_read_at timestamptz,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_message_threads_coach_id_idx
  on public.client_message_threads (coach_id);

drop trigger if exists client_message_threads_set_updated_at on public.client_message_threads;
create trigger client_message_threads_set_updated_at
  before update on public.client_message_threads
  for each row execute function public.set_updated_at();

alter table public.client_message_threads enable row level security;

drop policy if exists "Coaches can view their client message threads" on public.client_message_threads;
create policy "Coaches can view their client message threads"
  on public.client_message_threads for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their client message threads" on public.client_message_threads;
create policy "Coaches can insert their client message threads"
  on public.client_message_threads for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update their client message threads" on public.client_message_threads;
create policy "Coaches can update their client message threads"
  on public.client_message_threads for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Clients can view their message threads" on public.client_message_threads;
create policy "Clients can view their message threads"
  on public.client_message_threads for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can update their message threads" on public.client_message_threads;
create policy "Clients can update their message threads"
  on public.client_message_threads for update
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

-- ---------------------------------------------------------------------------
-- client_messages
-- ---------------------------------------------------------------------------

create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  sender_role public.message_sender_role not null,
  body text not null check (
    char_length(trim(body)) > 0
    and char_length(body) <= 4000
  ),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_messages_client_id_idx
  on public.client_messages (client_id);
create index if not exists client_messages_coach_id_idx
  on public.client_messages (coach_id);
create index if not exists client_messages_created_at_idx
  on public.client_messages (client_id, created_at asc);

alter table public.client_messages enable row level security;

drop policy if exists "Coaches can view their client messages" on public.client_messages;
create policy "Coaches can view their client messages"
  on public.client_messages for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their client messages" on public.client_messages;
create policy "Coaches can insert their client messages"
  on public.client_messages for insert
  with check (
    auth.uid() = coach_id
    and sender_id = auth.uid()
    and sender_role = 'coach'
  );

drop policy if exists "Clients can view their messages" on public.client_messages;
create policy "Clients can view their messages"
  on public.client_messages for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their messages" on public.client_messages;
create policy "Clients can insert their messages"
  on public.client_messages for insert
  with check (
    sender_id = auth.uid()
    and sender_role = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );

-- ---------------------------------------------------------------------------
-- Keep thread metadata in sync when a message is sent
-- ---------------------------------------------------------------------------

create or replace function public.upsert_client_message_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.client_message_threads (
    client_id,
    coach_id,
    last_message_at
  )
  values (
    new.client_id,
    new.coach_id,
    new.created_at
  )
  on conflict (client_id) do update
    set last_message_at = excluded.last_message_at,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists client_messages_upsert_thread on public.client_messages;
create trigger client_messages_upsert_thread
  after insert on public.client_messages
  for each row execute function public.upsert_client_message_thread();

comment on table public.client_messages is
  'Direct messages between a coach and their client.';
comment on table public.client_message_threads is
  'One thread per client with read timestamps for coach and client.';
