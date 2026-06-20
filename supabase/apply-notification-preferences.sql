-- Coach notification preferences on profiles (run in Supabase SQL editor)

alter table public.profiles
  add column if not exists notify_check_ins boolean not null default true,
  add column if not exists notify_workout_completions boolean not null default true,
  add column if not exists notify_missed_sessions boolean not null default false,
  add column if not exists notify_invite_accepted boolean not null default true,
  add column if not exists notify_weekly_summary boolean not null default false;
