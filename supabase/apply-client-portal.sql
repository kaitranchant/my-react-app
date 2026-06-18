-- Client portal workout access (migration 0014).
-- Run in Supabase Dashboard → SQL if clients cannot start/complete workouts or remove log sets.
--
-- Or CLI: npx supabase login && yarn db:link && yarn db:push

-- ---------------------------------------------------------------------------
-- client_scheduled_workouts — client UPDATE (status, timestamps)
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can update their scheduled workouts" on public.client_scheduled_workouts;
create policy "Clients can update their scheduled workouts"
  on public.client_scheduled_workouts for update
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
    )
  );

-- ---------------------------------------------------------------------------
-- workout_log_sets — client DELETE (set removal during save)
-- ---------------------------------------------------------------------------

drop policy if exists "Clients can delete their workout log sets" on public.workout_log_sets;
create policy "Clients can delete their workout log sets"
  on public.workout_log_sets for delete
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      join public.clients c on c.id = csw.client_id
      where csw.id = scheduled_workout_id
        and c.user_id = auth.uid()
    )
  );
