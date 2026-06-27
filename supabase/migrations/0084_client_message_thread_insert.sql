-- Allow clients to create their message thread row when marking messages read
-- (thread rows are normally created by trigger on message insert, but upsert
-- needs insert permission when the row is missing on older data).

drop policy if exists "Clients can insert their message threads" on public.client_message_threads;
create policy "Clients can insert their message threads"
  on public.client_message_threads for insert
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_id
        and c.user_id = auth.uid()
        and c.coach_id = coach_id
    )
  );
