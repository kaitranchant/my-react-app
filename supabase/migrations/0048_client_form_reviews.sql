-- Client form review submissions: lift videos in private storage for coach feedback

-- ---------------------------------------------------------------------------
-- client_form_reviews
-- ---------------------------------------------------------------------------

create table if not exists public.client_form_reviews (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_id uuid not null references public.profiles (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  storage_path text not null,
  content_type text not null,
  file_size_bytes integer,
  title text,
  client_notes text,
  coach_feedback text,
  uploaded_by public.check_in_submitted_by not null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists client_form_reviews_coach_id_idx
  on public.client_form_reviews (coach_id);
create index if not exists client_form_reviews_client_id_idx
  on public.client_form_reviews (client_id);
create index if not exists client_form_reviews_reviewed_at_idx
  on public.client_form_reviews (reviewed_at);
create index if not exists client_form_reviews_created_at_idx
  on public.client_form_reviews (created_at desc);

drop trigger if exists client_form_reviews_set_updated_at on public.client_form_reviews;
create trigger client_form_reviews_set_updated_at
  before update on public.client_form_reviews
  for each row execute function public.set_updated_at();

alter table public.client_form_reviews enable row level security;

-- ---------------------------------------------------------------------------
-- Coach policies
-- ---------------------------------------------------------------------------

drop policy if exists "Coaches can view their client form reviews" on public.client_form_reviews;
create policy "Coaches can view their client form reviews"
  on public.client_form_reviews for select
  using (auth.uid() = coach_id);

drop policy if exists "Coaches can insert client form reviews" on public.client_form_reviews;
create policy "Coaches can insert client form reviews"
  on public.client_form_reviews for insert
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can update client form reviews" on public.client_form_reviews;
create policy "Coaches can update client form reviews"
  on public.client_form_reviews for update
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "Coaches can delete client form reviews" on public.client_form_reviews;
create policy "Coaches can delete client form reviews"
  on public.client_form_reviews for delete
  using (auth.uid() = coach_id);

-- ---------------------------------------------------------------------------
-- Client policies
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can view their form reviews" on public.client_form_reviews;
create policy "Clients can view their form reviews"
  on public.client_form_reviews for select
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can insert their form reviews" on public.client_form_reviews;
create policy "Clients can insert their form reviews"
  on public.client_form_reviews for insert
  with check (
    uploaded_by = 'client'
    and reviewed_at is null
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );

drop policy if exists "Clients can update their form reviews" on public.client_form_reviews;
create policy "Clients can update their form reviews"
  on public.client_form_reviews for update
  using (
    uploaded_by = 'client'
    and reviewed_at is null
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    uploaded_by = 'client'
    and reviewed_at is null
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Clients can delete their form reviews" on public.client_form_reviews;
create policy "Clients can delete their form reviews"
  on public.client_form_reviews for delete
  using (
    uploaded_by = 'client'
    and reviewed_at is null
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket: private form review videos
-- Path format: clients/{client_id}/{review_id}.{ext}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-reviews',
  'form-reviews',
  false,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Coaches can read client form reviews" on storage.objects;
create policy "Coaches can read client form reviews"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'form-reviews'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can read their form reviews" on storage.objects;
create policy "Clients can read their form reviews"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'form-reviews'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can upload client form reviews" on storage.objects;
create policy "Coaches can upload client form reviews"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'form-reviews'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can upload their form reviews" on storage.objects;
create policy "Clients can upload their form reviews"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'form-reviews'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can update client form reviews" on storage.objects;
create policy "Coaches can update client form reviews"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'form-reviews'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can update their form reviews" on storage.objects;
create policy "Clients can update their form reviews"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'form-reviews'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "Coaches can delete client form reviews" on storage.objects;
create policy "Coaches can delete client form reviews"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'form-reviews'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.coach_id = auth.uid()
    )
  );

drop policy if exists "Clients can delete their form reviews" on storage.objects;
create policy "Clients can delete their form reviews"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'form-reviews'
    and (storage.foldername(name))[1] = 'clients'
    and exists (
      select 1
      from public.clients c
      where c.id::text = (storage.foldername(name))[2]
        and c.user_id = auth.uid()
    )
  );

comment on table public.client_form_reviews is
  'Lift form videos submitted by clients for coach review and feedback.';
