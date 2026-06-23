-- Lets portal clients read their coach's display name (profiles are owner-only via RLS).

create or replace function public.get_portal_coach_display_name()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_name text;
begin
  select c.coach_id
  into v_coach_id
  from public.clients c
  where c.user_id = auth.uid()
  limit 1;

  if v_coach_id is null then
    return 'Coach';
  end if;

  select coalesce(
    nullif(trim(p.full_name), ''),
    nullif(trim(p.business_name), ''),
    nullif(trim(coach_self.full_name), ''),
    'Coach'
  )
  into v_name
  from public.profiles p
  left join public.clients coach_self
    on coach_self.coach_id = v_coach_id
   and coach_self.is_coach_self = true
  where p.id = v_coach_id;

  return coalesce(v_name, 'Coach');
end;
$$;

grant execute on function public.get_portal_coach_display_name() to authenticated;
