-- Invited gym coaches (role = coach, never owner) may only access gym roster clients/teams.

create or replace function public.is_gym_invited_only_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_members gm
    where gm.coach_id = auth.uid()
      and gm.status = 'active'
  )
  and not exists (
    select 1
    from public.gym_members gm
    where gm.coach_id = auth.uid()
      and gm.status = 'active'
      and gm.role = 'owner'
  );
$$;

create or replace function public.can_coach_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client_id
      and (
        (
          c.coach_id = auth.uid()
          and (
            c.gym_id is not null
            or not public.is_gym_invited_only_coach()
          )
        )
        or (
          c.gym_id is not null
          and public.is_gym_member(c.gym_id)
        )
      )
  );
$$;

create or replace function public.can_coach_access_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    where t.id = target_team_id
      and (
        (
          t.coach_id = auth.uid()
          and (
            t.gym_id is not null
            or not public.is_gym_invited_only_coach()
          )
        )
        or (
          t.gym_id is not null
          and public.is_gym_member(t.gym_id)
        )
      )
  );
$$;

create or replace function public.coach_create_client(
  p_full_name text,
  p_email text default null,
  p_phone text default null,
  p_status public.client_status default 'active',
  p_coaching_type public.client_coaching_type default null,
  p_gym_id uuid default null,
  p_goal text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_plan public.subscription_plan;
  v_count integer;
  v_in_paid_facility boolean;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_gym_invited_only_coach() and p_gym_id is null then
    raise exception 'Invited gym coaches must add clients to a gym roster.';
  end if;

  if p_gym_id is not null and not public.is_gym_member(p_gym_id) then
    raise exception 'You must be a member of the selected gym.';
  end if;

  select p.subscription_plan into v_plan
  from public.profiles p
  where p.id = auth.uid();

  select exists (
    select 1
    from public.gym_members gm
    join public.gym_subscriptions gs on gs.gym_id = gm.gym_id
    where gm.coach_id = auth.uid()
      and gm.status = 'active'
      and gs.status in ('active', 'trialing')
      and gs.plan = 'facility'
  ) into v_in_paid_facility;

  if not v_in_paid_facility then
    v_count := public.coach_billable_client_count(auth.uid());

    if coalesce(v_plan, 'starter') = 'starter' and v_count >= 5 then
      raise exception 'Client limit reached. Upgrade to Growth for more clients.';
    end if;

    if v_plan = 'growth' and v_count >= 25 then
      raise exception 'Client limit reached. Upgrade to Scale for unlimited clients.';
    end if;
  end if;

  insert into public.clients (
    coach_id,
    full_name,
    email,
    phone,
    status,
    coaching_type,
    gym_id,
    goal,
    notes
  )
  values (
    auth.uid(),
    trim(p_full_name),
    nullif(trim(coalesce(p_email, '')), ''),
    nullif(trim(coalesce(p_phone, '')), ''),
    coalesce(p_status, 'active'::public.client_status),
    p_coaching_type,
    p_gym_id,
    nullif(trim(coalesce(p_goal, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_client_id;

  return v_client_id;
end;
$$;

drop policy if exists "Coaches can insert their teams" on public.teams;
create policy "Coaches can insert their teams"
  on public.teams for insert
  with check (
    auth.uid() = coach_id
    and (
      gym_id is not null
      or not public.is_gym_invited_only_coach()
    )
  );

grant execute on function public.is_gym_invited_only_coach() to authenticated;
