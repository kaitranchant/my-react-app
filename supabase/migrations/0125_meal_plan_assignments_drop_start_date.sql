-- Meal plan days are sort labels for meals, not a calendar cycle.
-- Assignments no longer track start dates or plan end/extension.

alter table public.meal_plan_assignments
  drop column if exists start_date;

comment on table public.meal_plan_assignments is
  'Links a client to an active meal plan template. Days on the plan are labels for sorting meals, not calendar dates.';
