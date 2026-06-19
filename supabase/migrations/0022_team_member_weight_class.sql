-- Weight class per team member (powerlifting / weight-class tracking)

alter table public.team_members
  add column if not exists weight_class text;
