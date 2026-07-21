-- Share gym form-review queues while keeping feedback updates narrowly scoped.

alter table public.client_form_reviews
  add column if not exists reviewed_by uuid
    references public.profiles (id) on delete set null;

create index if not exists client_form_reviews_reviewed_by_idx
  on public.client_form_reviews (reviewed_by)
  where reviewed_by is not null;

create index if not exists client_form_reviews_pending_created_idx
  on public.client_form_reviews (created_at desc)
  where reviewed_at is null;

drop policy if exists "Coaches can update client form reviews"
  on public.client_form_reviews;
drop policy if exists "Clients can update their form reviews"
  on public.client_form_reviews;

revoke update on public.client_form_reviews from authenticated;

create or replace function public.review_client_form_review(
  p_review_id uuid,
  p_coach_feedback text,
  p_coach_annotations jsonb default '[]'::jsonb
)
returns table (
  client_id uuid,
  primary_coach_id uuid,
  review_title text,
  was_previously_reviewed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_review public.client_form_reviews%rowtype;
  v_annotation jsonb;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and profile.role = 'coach'
  ) then
    raise exception 'Not authorized';
  end if;

  select review.*
  into v_review
  from public.client_form_reviews review
  where review.id = p_review_id
  for update;

  if not found or not public.can_coach_access_client(v_review.client_id) then
    raise exception 'Form review not found';
  end if;

  if char_length(coalesce(p_coach_feedback, '')) > 2000 then
    raise exception 'Feedback is too long';
  end if;

  if jsonb_typeof(coalesce(p_coach_annotations, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_coach_annotations, '[]'::jsonb)) > 50
  then
    raise exception 'Invalid annotations';
  end if;

  for v_annotation in
    select value
    from jsonb_array_elements(coalesce(p_coach_annotations, '[]'::jsonb))
  loop
    if jsonb_typeof(v_annotation) <> 'object'
      or coalesce(v_annotation ->> 'id', '') !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
      or jsonb_typeof(v_annotation -> 'timestampSeconds') <> 'number'
      or (v_annotation ->> 'timestampSeconds')::numeric < 0
      or (v_annotation ->> 'timestampSeconds')::numeric > 86400
      or nullif(btrim(v_annotation ->> 'text'), '') is null
      or char_length(v_annotation ->> 'text') > 500
    then
      raise exception 'Invalid annotation';
    end if;
  end loop;

  update public.client_form_reviews review
  set
    coach_feedback = nullif(btrim(coalesce(p_coach_feedback, '')), ''),
    coach_annotations = coalesce(p_coach_annotations, '[]'::jsonb),
    reviewed_at = timezone('utc', now()),
    reviewed_by = auth.uid(),
    client_viewed_at = null
  where review.id = v_review.id;

  return query
  select
    v_review.client_id,
    v_review.coach_id,
    v_review.title,
    v_review.reviewed_at is not null;
end;
$$;

revoke all on function public.review_client_form_review(uuid, text, jsonb)
  from public;
grant execute on function public.review_client_form_review(uuid, text, jsonb)
  to authenticated;

create or replace function public.mark_own_form_reviews_viewed()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.client_form_reviews review
  set client_viewed_at = timezone('utc', now())
  where review.reviewed_at is not null
    and review.client_viewed_at is null
    and exists (
      select 1
      from public.clients client
      where client.id = review.client_id
        and client.user_id = auth.uid()
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_own_form_reviews_viewed() from public;
grant execute on function public.mark_own_form_reviews_viewed()
  to authenticated;

-- Only owners may add roster rows directly. Invite acceptance continues through
-- the security-definer invite RPC, and gym creators may bootstrap themselves.
create or replace function public.is_gym_owner(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.gym_members membership
    where membership.gym_id = target_gym_id
      and membership.coach_id = auth.uid()
      and membership.role = 'owner'
      and membership.status = 'active'
  );
$$;

create or replace function public.can_bootstrap_gym_owner(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.gyms gym
    where gym.id = target_gym_id
      and gym.created_by = auth.uid()
  )
  and not exists (
    select 1
    from public.gym_members membership
    where membership.coach_id = auth.uid()
      and membership.status = 'active'
  );
$$;

revoke all on function public.is_gym_owner(uuid) from public;
revoke all on function public.can_bootstrap_gym_owner(uuid) from public;
grant execute on function public.is_gym_owner(uuid) to authenticated;
grant execute on function public.can_bootstrap_gym_owner(uuid) to authenticated;

drop policy if exists "Gym owners can insert members" on public.gym_members;
create policy "Gym owners can insert members"
  on public.gym_members for insert
  to authenticated
  with check (
    public.is_gym_owner(gym_id)
    or (
      coach_id = auth.uid()
      and role = 'owner'
      and status = 'active'
      and public.can_bootstrap_gym_owner(gym_id)
    )
  );
