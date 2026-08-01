-- Coach dashboard section visibility preferences

alter table public.profiles
  add column if not exists dashboard_section_visibility jsonb
    not null default '{
      "quickActions": true,
      "stats": true,
      "gettingStarted": true,
      "proactiveAlerts": true,
      "highPriorityTasks": true,
      "todaysSchedule": true,
      "actionItems": true,
      "recentActivity": true
    }'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_dashboard_section_visibility_object;

alter table public.profiles
  add constraint profiles_dashboard_section_visibility_object
  check (jsonb_typeof(dashboard_section_visibility) = 'object');
