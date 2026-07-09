-- Restore one active gym membership per coach.

with ranked as (
  select
    id,
    row_number() over (
      partition by coach_id
      order by
        case when role = 'owner' then 0 else 1 end,
        joined_at asc
    ) as rn
  from public.gym_members
  where status = 'active'
)
delete from public.gym_members gm
using ranked r
where gm.id = r.id
  and r.rn > 1;

create unique index if not exists gym_members_one_active_gym_per_coach_idx
  on public.gym_members (coach_id)
  where status = 'active';

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

  if exists (
    select 1
    from public.gym_members gm
    where gm.coach_id = p_user_id
      and gm.status = 'active'
      and gm.gym_id <> v_invite.gym_id
  ) then
    raise exception 'You can only belong to one gym at a time';
  end if;

  if lower(trim(v_invite.email)) <> lower(trim(p_email)) then
    raise exception 'Invite email does not match signup email';
  end if;

  insert into public.gym_members (gym_id, coach_id, role, status)
  values (v_invite.gym_id, p_user_id, 'coach', 'active')
  on conflict (gym_id, coach_id) do update
    set status = 'active',
        role = excluded.role;

  update public.gym_invites
  set status = 'accepted'
  where id = v_invite.id;

  return v_invite.gym_id;
end;
$$;
