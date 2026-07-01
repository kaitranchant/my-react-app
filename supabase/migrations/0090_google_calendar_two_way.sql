-- Google Calendar two-way sync: push watch channels + conflict timestamps

alter table public.coach_google_calendar_connections
  add column if not exists watch_channel_id text,
  add column if not exists watch_resource_id text,
  add column if not exists watch_token text,
  add column if not exists watch_expiration timestamptz,
  add column if not exists calendar_sync_token text,
  add column if not exists last_calendar_sync_at timestamptz;

alter table public.coaching_appointments
  add column if not exists google_calendar_updated_at timestamptz;

comment on column public.coach_google_calendar_connections.watch_channel_id is
  'Channel id sent to Google Calendar push notifications.';
comment on column public.coach_google_calendar_connections.calendar_sync_token is
  'Google Calendar events.list incremental sync token.';
comment on column public.coaching_appointments.google_calendar_updated_at is
  'Updated timestamp from the linked Google Calendar event for conflict resolution.';
