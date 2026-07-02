-- Nutrition setup form extended fields: apply after 0089/0095 migrations

alter table public.client_nutrition_profiles
  add column if not exists setup_goal text
    check (setup_goal is null or setup_goal in ('lose', 'maintain', 'gain', 'performance')),
  add column if not exists body_weight_lbs numeric(6, 1)
    check (body_weight_lbs is null or body_weight_lbs > 0),
  add column if not exists height_in numeric(5, 1)
    check (height_in is null or height_in > 0),
  add column if not exists age_years smallint
    check (age_years is null or (age_years >= 14 and age_years <= 100)),
  add column if not exists setup_biological_sex text
    check (setup_biological_sex is null or setup_biological_sex in ('male', 'female')),
  add column if not exists activity_level text
    check (
      activity_level is null
      or activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
    ),
  add column if not exists meal_frequency text,
  add column if not exists cooking_time_skill text,
  add column if not exists budget_constraints text,
  add column if not exists food_dislikes text,
  add column if not exists grocery_access text;
