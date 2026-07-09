-- Let gym peers view each other's coach-self profiles and backfill missing records.

create or replace function public.can_coach_access_client(target_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client_id
      and (
        (
          c.coach_id = auth.uid()
          and (
            c.gym_id is not null
            or not public.is_gym_invited_only_coach()
          )
        )
        or (
          c.gym_id is not null
          and public.is_gym_member(c.gym_id)
        )
        or (
          c.is_coach_self = true
          and exists (
            select 1
            from public.gym_members viewer
            join public.gym_members peer
              on peer.gym_id = viewer.gym_id
            where viewer.coach_id = auth.uid()
              and viewer.status = 'active'
              and peer.coach_id = c.coach_id
              and peer.status = 'active'
          )
        )
      )
  );
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
