-- Clients need insert access for nutrition profile upserts from the portal.
-- Supabase upsert checks insert policies even when the row already exists, so
-- portal actions use update when possible; this policy covers first-time inserts.

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

-- Broaden client update policy beyond notes-only (setup form, dietary info, etc.)
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
