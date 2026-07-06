-- Coach default layout when logging workouts on mobile (guided vs list)

alter table public.profiles
  add column if not exists default_workout_log_view text not null default 'guided';

alter table public.profiles
  drop constraint if exists profiles_default_workout_log_view_check;

alter table public.profiles
  add constraint profiles_default_workout_log_view_check
  check (default_workout_log_view in ('guided', 'list'));
