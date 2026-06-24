-- Appointment reminders + notification preferences

-- ---------------------------------------------------------------------------
-- Reminder preferences on profiles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists portal_notify_appointment_reminders boolean not null default true,
  add column if not exists notify_appointment_reminders boolean not null default true,
  add column if not exists appointment_reminder_hours integer not null default 24;

alter table public.profiles
  drop constraint if exists profiles_appointment_reminder_hours_check;
alter table public.profiles
  add constraint profiles_appointment_reminder_hours_check
  check (appointment_reminder_hours between 1 and 168);

comment on column public.profiles.portal_notify_appointment_reminders is
  'Email and push reminders before scheduled coaching appointments (client portal).';
comment on column public.profiles.notify_appointment_reminders is
  'Email and push reminders before upcoming coaching appointments (coach).';
comment on column public.profiles.appointment_reminder_hours is
  'How many hours before a session to send appointment reminders.';

-- ---------------------------------------------------------------------------
-- Extend client email nudge types
-- ---------------------------------------------------------------------------

alter table public.client_email_nudges
  drop constraint if exists client_email_nudges_nudge_type_check;

alter table public.client_email_nudges
  add constraint client_email_nudges_nudge_type_check
  check (
    nudge_type in (
      'workout_reminder',
      'check_in_due',
      'unread_digest',
      'appointment_reminder'
    )
  );

-- ---------------------------------------------------------------------------
-- coaching_appointment_reminders — dedupe client + coach pre-session alerts
-- ---------------------------------------------------------------------------

create table if not exists public.coaching_appointment_reminders (
  appointment_id uuid not null references public.coaching_appointments (id) on delete cascade,
  recipient text not null check (recipient in ('client', 'coach')),
  sent_at timestamptz not null default timezone('utc', now()),
  primary key (appointment_id, recipient)
);

create index if not exists coaching_appointment_reminders_sent_at_idx
  on public.coaching_appointment_reminders (sent_at desc);

alter table public.coaching_appointment_reminders enable row level security;

comment on table public.coaching_appointment_reminders is
  'Tracks pre-session reminder delivery to avoid duplicate emails/push notifications.';
