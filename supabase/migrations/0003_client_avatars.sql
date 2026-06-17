-- Client profile pictures (small avatars in Supabase Storage)

alter table public.clients
  add column if not exists avatar_url text;

-- ---------------------------------------------------------------------------
-- Storage bucket: public read, 100 KB max, images only
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  102400,
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage policies: coaches manage client avatars; clients manage their own
-- Path format: clients/{client_id}/avatar.webp
-- ---------------------------------------------------------------------------

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Coaches can upload client avatars" on storage.objects;
create policy "Coaches can upload client avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update client avatars" on storage.objects;
create policy "Coaches can update client avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can upload their own avatar" on storage.objects;
create policy "Clients can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can update their own avatar" on storage.objects;
create policy "Clients can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

-- Clients may update their linked row (avatar_url); app restricts columns in actions
drop policy if exists "Clients can update their own record" on public.clients;
create policy "Clients can update their own record"
  on public.clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
