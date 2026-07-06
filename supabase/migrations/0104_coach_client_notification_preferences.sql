-- Coach controls for outbound client notifications (email + push)

alter table public.profiles
  add column if not exists coach_send_client_messages boolean not null default true,
  add column if not exists coach_send_client_check_in_reviews boolean not null default true,
  add column if not exists coach_send_client_form_review_replies boolean not null default true,
  add column if not exists coach_send_client_nutrition_setup boolean not null default true,
  add column if not exists coach_send_client_team_updates boolean not null default true,
  add column if not exists coach_send_client_invites boolean not null default true,
  add column if not exists coach_send_client_workout_reminders boolean not null default true,
  add column if not exists coach_send_client_check_in_reminders boolean not null default true,
  add column if not exists coach_send_client_unread_digest boolean not null default true,
  add column if not exists coach_send_client_appointment_reminders boolean not null default true;
