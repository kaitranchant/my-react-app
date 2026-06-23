-- Coach notification preference for client personal records

alter table public.profiles
  add column if not exists notify_prs boolean not null default true;
