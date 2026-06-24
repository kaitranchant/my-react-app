-- Allow coaches to undo dismissed progressive overload suggestions

drop policy if exists "Coaches can delete their progressive overload decisions"
  on public.progressive_overload_decisions;

create policy "Coaches can delete their progressive overload decisions"
  on public.progressive_overload_decisions for delete
  using (coach_id = auth.uid() and status = 'dismissed');
