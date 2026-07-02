-- Nutrition setup form: goal, biometrics, lifestyle, and preference fields.

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

comment on column public.client_nutrition_profiles.setup_goal is
  'Client-reported nutrition goal from the setup form.';
comment on column public.client_nutrition_profiles.body_weight_lbs is
  'Client-reported body weight in pounds from the setup form.';
comment on column public.client_nutrition_profiles.height_in is
  'Client-reported height in inches from the setup form.';
comment on column public.client_nutrition_profiles.age_years is
  'Client-reported age from the setup form.';
comment on column public.client_nutrition_profiles.setup_biological_sex is
  'Client-reported biological sex from the setup form.';
comment on column public.client_nutrition_profiles.activity_level is
  'Client-reported activity level from the setup form.';
comment on column public.client_nutrition_profiles.meal_frequency is
  'Client-reported meal frequency or eating window from the setup form.';
comment on column public.client_nutrition_profiles.cooking_time_skill is
  'Client-reported cooking time and skill from the setup form.';
comment on column public.client_nutrition_profiles.budget_constraints is
  'Client-reported food budget constraints from the setup form.';
comment on column public.client_nutrition_profiles.food_dislikes is
  'Client-reported food dislikes from the setup form.';
comment on column public.client_nutrition_profiles.grocery_access is
  'Client-reported grocery access or shopping constraints from the setup form.';
