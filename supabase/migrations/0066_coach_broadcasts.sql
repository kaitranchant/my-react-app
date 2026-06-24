-- Coach broadcast messages: one send fans out to many client threads

-- ---------------------------------------------------------------------------
-- coach_broadcasts
-- ---------------------------------------------------------------------------

create table if not exists public.coach_broadcasts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  message_type public.client_message_type not null default 'text',
  body text,
  storage_path text,
  content_type text,
  media_duration_seconds numeric(10, 2),
  created_at timestamptz not null default timezone('utc', now()),
  constraint coach_broadcasts_content_check check (
    (
      message_type = 'text'
      and body is not null
      and char_length(trim(body)) > 0
      and char_length(body) <= 4000
      and storage_path is null
    )
    or (
      message_type = 'voice'
      and storage_path is not null
      and char_length(trim(coalesce(body, ''))) <= 500
    )
  )
);

create index if not exists coach_broadcasts_coach_id_idx
  on public.coach_broadcasts (coach_id);

alter table public.coach_broadcasts enable row level security;

drop policy if exists "Coaches can view their broadcasts" on public.coach_broadcasts;
create policy "Coaches can view their broadcasts"
  on public.coach_broadcasts for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert their broadcasts" on public.coach_broadcasts;
create policy "Coaches can insert their broadcasts"
  on public.coach_broadcasts for insert
  with check (
    auth.uid() = coach_id
    and sender_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Link fan-out messages to broadcast
-- ---------------------------------------------------------------------------

alter table public.client_messages
  add column if not exists broadcast_id uuid references public.coach_broadcasts (id) on delete set null;

create index if not exists client_messages_broadcast_id_idx
  on public.client_messages (broadcast_id)
  where broadcast_id is not null;
