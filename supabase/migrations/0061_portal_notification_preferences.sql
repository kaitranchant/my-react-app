-- Client portal notification preferences on profiles (0061)

alter table public.profiles
  add column if not exists portal_notify_messages boolean not null default true,
  add column if not exists portal_notify_check_in_reviews boolean not null default true,
  add column if not exists portal_notify_form_review_replies boolean not null default true,
  add column if not exists portal_notify_team_updates boolean not null default false;

comment on column public.profiles.portal_notify_messages is
  'Email client when their coach sends a portal message.';
comment on column public.profiles.portal_notify_check_in_reviews is
  'Email client when their coach reviews a check-in.';
comment on column public.profiles.portal_notify_form_review_replies is
  'Email client when their coach replies to a form review submission.';
comment on column public.profiles.portal_notify_team_updates is
  'Email client about team announcements and event updates.';
