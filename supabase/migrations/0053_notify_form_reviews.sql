-- Form review notification preference on profiles (0053)

alter table public.profiles
  add column if not exists notify_form_reviews boolean not null default true;
