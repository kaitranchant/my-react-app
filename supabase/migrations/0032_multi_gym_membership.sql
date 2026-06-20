-- Allow coaches to belong to multiple gyms at once

drop index if exists public.gym_members_one_active_gym_per_coach_idx;

create or replace function public.link_gym_invite(
  p_token uuid,
  p_user_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.gym_invites%rowtype;
begin
  select *
  into v_invite
  from public.gym_invites
  where invite_token = p_token
    and status = 'pending'
    and (expires_at is null or expires_at > timezone('utc', now()))
  for update;

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if exists (
    select 1
    from public.gym_members gm
    where gm.coach_id = p_user_id
      and gm.gym_id = v_invite.gym_id
      and gm.status = 'active'
  ) then
    raise exception 'You are already a member of this gym';
  end if;

  if lower(trim(v_invite.email)) <> lower(trim(p_email)) then
    raise exception 'Invite email does not match signup email';
  end if;

  insert into public.gym_members (gym_id, coach_id, role, status)
  values (v_invite.gym_id, p_user_id, 'member', 'active')
  on conflict (gym_id, coach_id) do update
    set status = 'active',
        role = excluded.role;

  update public.gym_invites
  set status = 'accepted'
  where id = v_invite.id;

  return v_invite.gym_id;
end;
$$;
