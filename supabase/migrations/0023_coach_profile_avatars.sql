-- Coach profile pictures in the avatars bucket
-- Path format: coaches/{user_id}/avatar.webp

drop policy if exists "Coaches can upload their own avatar" on storage.objects;
create policy "Coaches can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'coaches'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Coaches can update their own avatar" on storage.objects;
create policy "Coaches can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'coaches'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists "Coaches can delete their own avatar" on storage.objects;
create policy "Coaches can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'coaches'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
