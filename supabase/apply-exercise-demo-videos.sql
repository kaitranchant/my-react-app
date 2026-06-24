-- Coach-uploaded demo videos for library exercises (migration 0070).
-- Run in Supabase Dashboard → SQL if upload shows bucket/column errors.

alter table public.exercises
  add column if not exists demo_video_path text;

comment on column public.exercises.demo_video_path is
  'Storage path in exercise-demos bucket for coach-uploaded demonstration video.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-demos',
  'exercise-demos',
  true,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Exercise demo videos are publicly readable" on storage.objects;
create policy "Exercise demo videos are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'exercise-demos');

drop policy if exists "Coaches can upload exercise demo videos" on storage.objects;
create policy "Coaches can upload exercise demo videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'exercise-demos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.exercises e
      where e.coach_id = auth.uid()
        and (storage.foldername(name))[2] like e.id::text || '.%'
    )
  );

drop policy if exists "Coaches can update exercise demo videos" on storage.objects;
create policy "Coaches can update exercise demo videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'exercise-demos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.exercises e
      where e.coach_id = auth.uid()
        and (storage.foldername(name))[2] like e.id::text || '.%'
    )
  );

drop policy if exists "Coaches can delete exercise demo videos" on storage.objects;
create policy "Coaches can delete exercise demo videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'exercise-demos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1
      from public.exercises e
      where e.coach_id = auth.uid()
        and (storage.foldername(name))[2] like e.id::text || '.%'
    )
  );
