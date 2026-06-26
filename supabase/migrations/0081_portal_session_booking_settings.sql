-- Portal clients need coach session-booking settings without full profile access.

create or replace function public.get_portal_session_booking_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach_id uuid;
  v_settings jsonb;
begin
  select c.coach_id
  into v_coach_id
  from public.clients c
  where c.user_id = auth.uid()
    and c.invite_status = 'accepted'
  limit 1;

  if v_coach_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'session_booking_enabled', p.session_booking_enabled,
    'default_session_duration_minutes', p.default_session_duration_minutes,
    'booking_buffer_minutes', p.booking_buffer_minutes,
    'booking_min_notice_hours', p.booking_min_notice_hours,
    'booking_max_days_ahead', p.booking_max_days_ahead,
    'default_session_location', p.default_session_location,
    'booking_requires_session_pack', p.booking_requires_session_pack,
    'appointment_reminder_hours', p.appointment_reminder_hours
  )
  into v_settings
  from public.profiles p
  where p.id = v_coach_id;

  return v_settings;
end;
$$;

grant execute on function public.get_portal_session_booking_settings() to authenticated;

comment on function public.get_portal_session_booking_settings() is
  'Returns session booking settings for the authenticated portal client''s coach.';
