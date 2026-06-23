-- Run if portal program card shows name/description but no "Week X of Y" progress.
-- Also run apply-portal-coach-display-name.sql if coach messages still say "Coach said …".

drop policy if exists "Clients can view assigned program scheduled workouts" on public.program_scheduled_workouts;
create policy "Clients can view assigned program scheduled workouts"
  on public.program_scheduled_workouts for select
  using (
    exists (
      select 1
      from public.program_assignments pa
      join public.clients c on c.id = pa.client_id
      where pa.program_id = program_scheduled_workouts.program_id
        and c.user_id = auth.uid()
        and pa.status = 'active'
    )
  );
