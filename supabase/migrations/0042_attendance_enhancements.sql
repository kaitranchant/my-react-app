-- Attendance enhancements: late status + per-session coaching type

-- ---------------------------------------------------------------------------
-- Add 'late' to team_event_attendance_status enum
-- ---------------------------------------------------------------------------

alter type public.team_event_attendance_status add value if not exists 'late';

-- ---------------------------------------------------------------------------
-- Per-session coaching type on daily attendance
-- ---------------------------------------------------------------------------

alter table public.client_daily_attendance
  add column if not exists coaching_type public.client_coaching_type;

comment on column public.client_daily_attendance.coaching_type is
  'Optional per-session training type override (in-person, online, hybrid).';
