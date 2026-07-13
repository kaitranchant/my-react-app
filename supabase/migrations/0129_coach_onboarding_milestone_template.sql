-- Coach-selected milestones for the client onboarding checklist.
-- Shape: { "programAssigned": false, ... }
-- false = excluded from template; missing/true = included.
-- Empty object keeps all milestones (backward compatible).

alter table public.profiles
  add column if not exists onboarding_milestone_template jsonb
    not null default '{}'::jsonb;
