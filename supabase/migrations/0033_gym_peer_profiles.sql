-- Allow gym members to view profiles of coaches who share the same gym

drop policy if exists "Gym peers can view member profiles" on public.profiles;
create policy "Gym peers can view member profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.gym_members gm_self
      join public.gym_members gm_peer
        on gm_peer.gym_id = gm_self.gym_id
       and gm_peer.status = 'active'
      where gm_self.coach_id = auth.uid()
        and gm_self.status = 'active'
        and gm_peer.coach_id = profiles.id
    )
  );
