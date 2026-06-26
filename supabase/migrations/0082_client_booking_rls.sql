-- Clients booking appointments must read coach session_booking_enabled; profiles are owner-only.

create or replace function public.coach_session_booking_enabled(p_coach_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select p.session_booking_enabled
      from public.profiles p
      where p.id = p_coach_id
    ),
    false
  );
$$;

grant execute on function public.coach_session_booking_enabled(uuid) to authenticated;

drop policy if exists "Clients can book coaching appointments" on public.coaching_appointments;
create policy "Clients can book coaching appointments"
  on public.coaching_appointments for insert
  with check (
    booked_by = 'client'
    and exists (
      select 1
      from public.clients c
      where c.id = coaching_appointments.client_id
        and c.user_id = auth.uid()
        and c.coach_id = coaching_appointments.coach_id
    )
    and public.coach_session_booking_enabled(coaching_appointments.coach_id)
  );
