-- Run after gyms migrations if coaches cannot add clients (RLS insert error).

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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_gym_id is not null and not public.is_gym_member(p_gym_id) then
    raise exception 'You must be a member of the selected gym.';
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

grant execute on function public.coach_create_client(
  text,
  text,
  text,
  public.client_status,
  public.client_coaching_type,
  uuid,
  text,
  text
) to authenticated;

drop policy if exists "Coaches can insert their clients" on public.clients;

create policy "Coaches can insert their clients"
  on public.clients for insert
  to authenticated
  with check (
    auth.uid() = coach_id
    and (
      gym_id is null
      or public.is_gym_member(gym_id)
    )
  );
