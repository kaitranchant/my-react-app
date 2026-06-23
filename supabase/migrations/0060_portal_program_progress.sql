-- Portal clients need program day offsets to show "Week X of Y" on the home dashboard.

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
