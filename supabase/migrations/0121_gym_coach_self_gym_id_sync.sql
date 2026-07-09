-- Allow coach-self gym_id sync and finish backfill blocked by clients_gym_share_guard.

create or replace function public.clients_gym_share_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE'
    and old.is_coach_self
    and new.is_coach_self
    and new.coach_id is not distinct from old.coach_id
    and new.gym_id is distinct from old.gym_id
    and new.user_id is not distinct from old.user_id
    and new.invite_status is not distinct from old.invite_status
    and new.invite_token is not distinct from old.invite_token
    and new.invite_expires_at is not distinct from old.invite_expires_at
    and (
      auth.uid() is null
      or (
        auth.uid() = old.coach_id
        and (new.gym_id is null or public.is_gym_member(new.gym_id))
      )
      or (
        new.gym_id is not null
        and exists (
          select 1
          from public.gym_members gm
          where gm.coach_id = old.coach_id
            and gm.gym_id = new.gym_id
            and gm.status = 'active'
        )
      )
    )
  then
    return new;
  end if;

  if auth.uid() is distinct from old.coach_id then
    if old.invite_status = 'pending'
      and new.invite_status = 'accepted'
      and old.user_id is null
      and new.user_id is not null
      and (auth.uid() is null or new.user_id = auth.uid())
      and new.coach_id is not distinct from old.coach_id
      and new.gym_id is not distinct from old.gym_id
      and new.is_coach_self is not distinct from old.is_coach_self
    then
      return new;
    end if;

    if new.coach_id is distinct from old.coach_id
      or new.gym_id is distinct from old.gym_id
      or new.user_id is distinct from old.user_id
      or new.invite_token is distinct from old.invite_token
      or new.invite_status is distinct from old.invite_status
      or new.invite_expires_at is distinct from old.invite_expires_at
      or new.is_coach_self is distinct from old.is_coach_self
    then
      raise exception 'Only the primary coach can change client ownership or sharing settings';
    end if;
  end if;

  if new.gym_id is distinct from old.gym_id and auth.uid() = old.coach_id then
    if new.gym_id is not null and not public.is_gym_member(new.gym_id) then
      raise exception 'You must be an active member of the gym to share this client';
    end if;
  end if;

  return new;
end;
$$;

insert into public.clients (coach_id, full_name, status, is_coach_self, gym_id, user_id)
select
  gm.coach_id,
  coalesce(nullif(trim(p.full_name), ''), 'Coach'),
  'active',
  true,
  gm.gym_id,
  gm.coach_id
from public.gym_members gm
join public.profiles p on p.id = gm.coach_id
where gm.status = 'active'
  and not exists (
    select 1
    from public.clients c
    where c.coach_id = gm.coach_id
      and c.is_coach_self = true
  );

update public.clients c
set gym_id = gm.gym_id
from public.gym_members gm
where c.coach_id = gm.coach_id
  and c.is_coach_self = true
  and gm.status = 'active'
  and c.gym_id is distinct from gm.gym_id;
