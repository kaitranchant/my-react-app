-- Adds client_notes to scheduled_workout_exercises (migration 0055).

alter table public.scheduled_workout_exercises
  add column if not exists client_notes text;

comment on column public.scheduled_workout_exercises.client_notes is
  'Notes added by the client during logging for their coach to review.';

drop policy if exists "Clients can update client notes on scheduled workout exercises" on public.scheduled_workout_exercises;
create policy "Clients can update client notes on scheduled workout exercises"
  on public.scheduled_workout_exercises for update
  using (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      join public.clients c on c.id = csw.client_id
      where csw.id = scheduled_workout_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.client_scheduled_workouts csw
      join public.clients c on c.id = csw.client_id
      where csw.id = scheduled_workout_id
        and c.user_id = auth.uid()
    )
  );
