-- Cap fixed-length weekly series so the rolling horizon does not extend them.

alter table public.coaching_appointment_series
  add column if not exists max_week_index int
    check (max_week_index is null or max_week_index >= 0);

comment on column public.coaching_appointment_series.max_week_index is
  'When set, this series stops after this zero-based week index. Null means ongoing.';
