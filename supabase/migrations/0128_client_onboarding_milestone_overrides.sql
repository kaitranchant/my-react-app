-- Coach manual overrides for client onboarding checklist milestones.
-- Shape: { "programAssigned": true, "firstWorkoutLogged": false, ... }
-- Missing keys use auto-detected status.

alter table public.clients
  add column if not exists onboarding_milestone_overrides jsonb
    not null default '{}'::jsonb;
