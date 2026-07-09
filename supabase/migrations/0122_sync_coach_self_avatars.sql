-- Sync coach profile photos onto coach-self client records.

update public.clients c
set
  avatar_url = p.avatar_url,
  full_name = coalesce(nullif(trim(p.full_name), ''), c.full_name)
from public.profiles p
where c.coach_id = p.id
  and c.is_coach_self = true
  and (
    c.avatar_url is distinct from p.avatar_url
    or c.full_name is distinct from coalesce(nullif(trim(p.full_name), ''), c.full_name)
  );
