-- PR notification preference on profiles (run in Supabase SQL editor)

alter table public.profiles
  add column if not exists notify_prs boolean not null default true;
