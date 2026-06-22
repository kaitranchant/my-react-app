-- Timestamped coach video markers on form reviews

alter table public.client_form_reviews
  add column if not exists coach_annotations jsonb not null default '[]'::jsonb;

comment on column public.client_form_reviews.coach_annotations is
  'Timestamped coach video markers: [{ "id": uuid, "timestampSeconds": number, "text": string }]';
