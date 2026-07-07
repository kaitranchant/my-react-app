-- Coach assessment notes captured during client onboarding

alter table public.clients
  add column if not exists onboarding_assessment_notes text;
