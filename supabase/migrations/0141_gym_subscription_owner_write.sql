-- Allow gym owners to create/update their gym_subscriptions row when
-- attaching an existing Facility plan (e.g. recreate gym after delete).

drop policy if exists "Gym owners can insert their gym subscription" on public.gym_subscriptions;
create policy "Gym owners can insert their gym subscription"
  on public.gym_subscriptions for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_subscriptions.gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );

drop policy if exists "Gym owners can update their gym subscription" on public.gym_subscriptions;
create policy "Gym owners can update their gym subscription"
  on public.gym_subscriptions for update
  to authenticated
  using (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_subscriptions.gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = gym_subscriptions.gym_id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );
