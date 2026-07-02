-- Link client invites from the app after signup instead of during auth user creation.
-- Linking inside handle_new_user rolled back the auth user when invite linking failed.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role;
  v_gym_token uuid;
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'coach'::public.user_role);

  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', v_role)
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    role = excluded.role;

  begin
    v_gym_token := (new.raw_user_meta_data ->> 'gym_invite_token')::uuid;
  exception
    when invalid_text_representation then
      v_gym_token := null;
  end;

  if v_gym_token is not null and v_role = 'coach' then
    perform public.link_gym_invite(v_gym_token, new.id, new.email);
  end if;

  return new;
end;
$$;
