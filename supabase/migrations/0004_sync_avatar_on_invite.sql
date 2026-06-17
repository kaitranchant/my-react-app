-- Sync coach-uploaded client avatar to profile when invite is accepted

create or replace function public.link_client_invite(
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
  v_client public.clients%rowtype;
begin
  select *
  into v_client
  from public.clients
  where invite_token = p_token
    and invite_status = 'pending'
    and (invite_expires_at is null or invite_expires_at > timezone('utc', now()))
  for update;

  if not found then
    raise exception 'Invalid or expired invite';
  end if;

  if v_client.email is null or lower(trim(v_client.email)) <> lower(trim(p_email)) then
    raise exception 'Invite email does not match signup email';
  end if;

  update public.clients
  set
    user_id = p_user_id,
    invite_status = 'accepted',
    invite_token = null,
    invite_expires_at = null
  where id = v_client.id;

  update public.profiles
  set
    role = 'client',
    avatar_url = coalesce(v_client.avatar_url, public.profiles.avatar_url)
  where id = p_user_id;

  return v_client.id;
end;
$$;
