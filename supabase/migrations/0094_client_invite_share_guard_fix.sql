-- Allow client invite acceptance to update ownership fields without the coach session.

create or replace function public.clients_gym_share_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    if old.is_coach_self then
      raise exception 'Coach self profile cannot be shared with a gym';
    end if;
  end if;

  return new;
end;
$$;
