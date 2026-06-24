-- Client email nudges (run in Supabase SQL editor)

alter table public.profiles
  add column if not exists portal_notify_workout_reminders boolean not null default true,
  add column if not exists portal_notify_check_in_reminders boolean not null default true,
  add column if not exists portal_notify_unread_digest boolean not null default true;

create table if not exists public.client_email_nudges (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  nudge_type text not null check (
    nudge_type in ('workout_reminder', 'check_in_due', 'unread_digest')
  ),
  reference_key text not null,
  sent_at timestamptz not null default now(),
  unique (client_id, nudge_type, reference_key)
);

create index if not exists client_email_nudges_client_id_idx
  on public.client_email_nudges (client_id);

alter table public.client_email_nudges enable row level security;
