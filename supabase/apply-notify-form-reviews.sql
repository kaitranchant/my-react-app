-- Form review notification preference on profiles (run in Supabase SQL editor)

alter table public.profiles
  add column if not exists notify_form_reviews boolean not null default true;
