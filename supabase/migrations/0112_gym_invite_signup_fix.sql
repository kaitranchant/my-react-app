-- Link gym invites from the app after signup instead of during auth user creation.
-- Linking inside handle_new_user rolled back the auth user when invite linking failed.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'coach'::public.user_role);

  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_role)
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = excluded.role;

  return new;
end;
$$;

create or replace function public.get_gym_invite_preview(p_token uuid)
returns table (
  gym_name text,
  inviter_name text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    g.name as gym_name,
    coalesce(p.full_name, 'A coach') as inviter_name,
    gi.email as email
  from public.gym_invites gi
  join public.gyms g on g.id = gi.gym_id
  left join public.profiles p on p.id = gi.invited_by
  where gi.invite_token = p_token
    and gi.status = 'pending'
    and (gi.expires_at is null or gi.expires_at > timezone('utc', now()));
end;
$$;
