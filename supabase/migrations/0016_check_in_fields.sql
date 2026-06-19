-- Expand check-in metrics: calm scale, recovery fields, pain flags

-- ---------------------------------------------------------------------------
-- Rename stress_level → calm_level (1 = very stressed, 5 = very calm)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'client_check_ins'
      and column_name = 'stress_level'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'client_check_ins'
      and column_name = 'calm_level'
  ) then
    alter table public.client_check_ins
      rename column stress_level to calm_level;
  end if;
end $$;

comment on column public.client_check_ins.calm_level is
  'Self-rated calmness: 1 = very stressed, 5 = very calm.';

-- ---------------------------------------------------------------------------
-- New metric columns
-- ---------------------------------------------------------------------------

alter table public.client_check_ins
  add column if not exists sleep_quality smallint
    check (sleep_quality is null or (sleep_quality >= 1 and sleep_quality <= 5)),
  add column if not exists motivation_level smallint
    check (motivation_level is null or (motivation_level >= 1 and motivation_level <= 5)),
  add column if not exists nutrition_adherence smallint
    check (nutrition_adherence is null or (nutrition_adherence >= 1 and nutrition_adherence <= 5)),
  add column if not exists soreness_level smallint
    check (soreness_level is null or (soreness_level >= 1 and soreness_level <= 5)),
  add column if not exists soreness_notes text,
  add column if not exists has_pain boolean not null default false,
  add column if not exists pain_notes text;

comment on column public.client_check_ins.sleep_quality is
  'Sleep quality rating: 1 = poor, 5 = excellent.';
comment on column public.client_check_ins.motivation_level is
  'Training motivation: 1 = none, 5 = very high.';
comment on column public.client_check_ins.nutrition_adherence is
  'Nutrition plan adherence: 1 = poor, 5 = excellent.';
comment on column public.client_check_ins.soreness_level is
  'Overall muscle soreness: 1 = none, 5 = severe.';
comment on column public.client_check_ins.soreness_notes is
  'Which muscle groups are sore and any context.';
comment on column public.client_check_ins.pain_notes is
  'Details when has_pain is true (injury, pain location, etc.).';
