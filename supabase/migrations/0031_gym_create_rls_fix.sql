-- Fix gym creation RLS (0031)

drop policy if exists "Gym members can view their gym" on public.gyms;
create policy "Gym members can view their gym"
  on public.gyms for select
  using (
    public.is_gym_member(id)
    or created_by = auth.uid()
  );

drop policy if exists "Gym owners can delete their gym" on public.gyms;
create policy "Gym owners can delete their gym"
  on public.gyms for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.gym_members gm
      where gm.gym_id = id
        and gm.coach_id = auth.uid()
        and gm.role = 'owner'
        and gm.status = 'active'
    )
  );
