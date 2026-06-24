-- Message media: voice notes and rich message types

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_message_type') then
    create type public.client_message_type as enum ('text', 'voice');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Extend client_messages
-- ---------------------------------------------------------------------------

alter table public.client_messages
  add column if not exists message_type public.client_message_type not null default 'text',
  add column if not exists storage_path text,
  add column if not exists content_type text,
  add column if not exists media_duration_seconds numeric(10, 2);

alter table public.client_messages
  alter column body drop not null;

alter table public.client_messages
  drop constraint if exists client_messages_body_check;

alter table public.client_messages
  add constraint client_messages_content_check check (
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
  );

-- ---------------------------------------------------------------------------
-- Storage bucket: private message media (voice notes)
-- Path format: {client_id}/{message_id}.{ext}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  false,
  2097152,
  array['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Coaches can read client message media" on storage.objects;
create policy "Coaches can read client message media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and public.can_coach_access_client(c.id)
    )
  );

drop policy if exists "Clients can read their message media" on storage.objects;
create policy "Clients can read their message media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can upload client message media" on storage.objects;
create policy "Coaches can upload client message media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and public.can_coach_access_client(c.id)
    )
  );

drop policy if exists "Clients can upload their message media" on storage.objects;
create policy "Clients can upload their message media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete client message media" on storage.objects;
create policy "Coaches can delete client message media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and public.can_coach_access_client(c.id)
    )
  );

drop policy if exists "Clients can delete their message media" on storage.objects;
create policy "Clients can delete their message media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[1]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can read message media by reference" on storage.objects;
create policy "Participants can read message media by reference"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'message-media'
    and exists (
      select 1
      from public.client_messages m
      join public.clients c on c.id = m.client_id
      where m.storage_path = name
        and (
          c.user_id = auth.uid()
          or public.can_coach_access_client(c.id)
        )
    )
  );

drop policy if exists "Coaches can upload broadcast message media" on storage.objects;
create policy "Coaches can upload broadcast message media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-media'
    and (storage.foldername(name))[1] = 'broadcasts'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
