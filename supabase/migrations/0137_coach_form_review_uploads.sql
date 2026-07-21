-- Allow any coach with client access to add and view workout form-review media.

drop policy if exists "Coaches can view their client form reviews"
  on public.client_form_reviews;
create policy "Coaches can view their client form reviews"
  on public.client_form_reviews for select
  using (public.can_coach_access_client(client_id));

drop policy if exists "Coaches can insert client form reviews"
  on public.client_form_reviews;
create policy "Coaches can insert client form reviews"
  on public.client_form_reviews for insert
  with check (
    uploaded_by = 'coach'
    and public.can_coach_access_client(client_id)
    and exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.coach_id = coach_id
    )
  );

drop policy if exists "Coaches can delete client form reviews"
  on public.client_form_reviews;
create policy "Coaches can delete client form reviews"
  on public.client_form_reviews for delete
  using (
    auth.uid() = coach_id
    or (
      uploaded_by = 'coach'
      and public.can_coach_access_client(client_id)
    )
  );

drop policy if exists "Coaches can read client form reviews"
  on storage.objects;
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
        and public.can_coach_access_client(c.id)
    )
  );

drop policy if exists "Coaches can upload client form reviews"
  on storage.objects;
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
        and public.can_coach_access_client(c.id)
    )
  );

drop policy if exists "Coaches can delete client form reviews"
  on storage.objects;
create policy "Coaches can delete client form reviews"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'form-reviews'
    and exists (
      select 1
      from public.client_form_reviews review
      where review.storage_path = name
        and (
          auth.uid() = review.coach_id
          or (
            review.uploaded_by = 'coach'
            and public.can_coach_access_client(review.client_id)
          )
        )
    )
  );
