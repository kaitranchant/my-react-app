-- Custom display names for meal plan days (e.g. "Monday", "High carb day")

alter table public.meal_plan_days
  add column if not exists label text;

comment on column public.meal_plan_days.label is
  'Optional custom day name shown instead of the default Day N label.';
