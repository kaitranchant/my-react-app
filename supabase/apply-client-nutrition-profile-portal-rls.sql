-- Client portal RLS for client_nutrition_profiles inserts/updates

drop policy if exists "Clients can insert their nutrition profile" on public.client_nutrition_profiles;
create policy "Clients can insert their nutrition profile"
  on public.client_nutrition_profiles for insert
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );

drop policy if exists "Clients can update their nutrition profile notes" on public.client_nutrition_profiles;
drop policy if exists "Clients can update their nutrition profile" on public.client_nutrition_profiles;
create policy "Clients can update their nutrition profile"
  on public.client_nutrition_profiles for update
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );
