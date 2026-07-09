-- Move coach notes that were logged during sessions (pre-coach_session_notes column)
-- out of workout_notes so they no longer appear as builder prescription notes.

update public.scheduled_workout_exercises swe
set coach_session_notes = trim(swe.workout_notes)
from public.client_scheduled_workouts csw
where swe.scheduled_workout_id = csw.id
  and swe.workout_notes is not null
  and trim(swe.workout_notes) != ''
  and (swe.coach_session_notes is null or trim(swe.coach_session_notes) = '')
  and (
    csw.status in ('completed', 'skipped')
    or csw.started_at is not null
    or exists (
      select 1
      from public.workout_log_sets wls
      where wls.scheduled_workout_id = csw.id
    )
  );

update public.scheduled_workout_exercises swe
set workout_notes = null
from public.client_scheduled_workouts csw
where swe.scheduled_workout_id = csw.id
  and swe.coach_session_notes is not null
  and trim(swe.coach_session_notes) != ''
  and swe.workout_notes = swe.coach_session_notes;
