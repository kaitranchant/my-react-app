-- Client portal notification preferences on profiles (run in Supabase SQL editor)

alter table public.profiles
  add column if not exists portal_notify_messages boolean not null default true,
  add column if not exists portal_notify_check_in_reviews boolean not null default true,
  add column if not exists portal_notify_form_review_replies boolean not null default true,
  add column if not exists portal_notify_team_updates boolean not null default false;
