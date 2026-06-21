-- Attendance enhancements (migration 0042)
-- Run in Supabase Dashboard → SQL after migrations through 0041

alter type public.team_event_attendance_status add value if not exists 'late';

alter table public.client_daily_attendance
  add column if not exists coaching_type public.client_coaching_type;

comment on column public.client_daily_attendance.coaching_type is
  'Optional per-session training type override (in-person, online, hybrid).';
