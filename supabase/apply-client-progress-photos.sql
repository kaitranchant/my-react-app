-- Client progress photos (mirrors 0018_client_progress_photos.sql)
-- Run in Supabase Dashboard → SQL if not using yarn db:push

-- ---------------------------------------------------------------------------
-- progress_photo_pose enum
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'progress_photo_pose') then
    create type public.progress_photo_pose as enum ('front', 'side', 'back');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- client_progress_photos
-- ---------------------------------------------------------------------------

create table if not exists public.client_progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  check_in_id uuid references public.client_check_ins (id) on delete set null,
  photo_date date not null,
  pose public.progress_photo_pose not null,
  storage_path text not null,
  caption text,
  uploaded_by public.check_in_submitted_by not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists client_progress_photos_check_in_pose_key
  on public.client_progress_photos (check_in_id, pose)
  where check_in_id is not null;

create index if not exists client_progress_photos_coach_id_idx
  on public.client_progress_photos (coach_id);
create index if not exists client_progress_photos_client_id_idx
  on public.client_progress_photos (client_id);
create index if not exists client_progress_photos_photo_date_idx
  on public.client_progress_photos (photo_date desc);
create index if not exists client_progress_photos_check_in_id_idx
  on public.client_progress_photos (check_in_id);

drop trigger if exists client_progress_photos_set_updated_at on public.client_progress_photos;
create trigger client_progress_photos_set_updated_at
  before update on public.client_progress_photos
  for each row execute function public.set_updated_at();

alter table public.client_progress_photos enable row level security;

drop policy if exists "Coaches can view their client progress photos" on public.client_progress_photos;
create policy "Coaches can view their client progress photos"
  on public.client_progress_photos for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert client progress photos" on public.client_progress_photos;
create policy "Coaches can insert client progress photos"
  on public.client_progress_photos for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update client progress photos" on public.client_progress_photos;
create policy "Coaches can update client progress photos"
  on public.client_progress_photos for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete client progress photos" on public.client_progress_photos;
create policy "Coaches can delete client progress photos"
  on public.client_progress_photos for delete
  using (auth.uid() = coach_id);

drop policy if exists "Clients can view their progress photos" on public.client_progress_photos;
create policy "Clients can view their progress photos"
  on public.client_progress_photos for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their progress photos" on public.client_progress_photos;
create policy "Clients can insert their progress photos"
  on public.client_progress_photos for insert
  with check (
    uploaded_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
    and (
      check_in_id is null
      or exists (
        select 1
        from public.client_check_ins ci
        where ci.id = check_in_id
          and ci.client_id = client_id
          and ci.reviewed_at is null
      )
    )
  );

drop policy if exists "Clients can update their progress photos" on public.client_progress_photos;
create policy "Clients can update their progress photos"
  on public.client_progress_photos for update
  using (
    uploaded_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
    and (
      check_in_id is null
      or exists (
        select 1
        from public.client_check_ins ci
        where ci.id = check_in_id
          and ci.client_id = client_id
          and ci.reviewed_at is null
      )
    )
  )
  with check (
    uploaded_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
    and (
      check_in_id is null
      or exists (
        select 1
        from public.client_check_ins ci
        where ci.id = check_in_id
          and ci.client_id = client_id
          and ci.reviewed_at is null
      )
    )
  );

drop policy if exists "Clients can delete their progress photos" on public.client_progress_photos;
create policy "Clients can delete their progress photos"
  on public.client_progress_photos for delete
  using (
    uploaded_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
    and (
      check_in_id is null
      or exists (
        select 1
        from public.client_check_ins ci
        where ci.id = check_in_id
          and ci.client_id = client_id
          and ci.reviewed_at is null
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  2097152,
  array['image/jpeg', 'image/webp', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Coaches can read client progress photos" on storage.objects;
create policy "Coaches can read client progress photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can read their progress photos" on storage.objects;
create policy "Clients can read their progress photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can upload client progress photos" on storage.objects;
create policy "Coaches can upload client progress photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can upload their progress photos" on storage.objects;
create policy "Clients can upload their progress photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update client progress photos" on storage.objects;
create policy "Coaches can update client progress photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can update their progress photos" on storage.objects;
create policy "Clients can update their progress photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete client progress photos" on storage.objects;
create policy "Coaches can delete client progress photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can delete their progress photos" on storage.objects;
create policy "Clients can delete their progress photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );
