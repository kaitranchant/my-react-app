-- Nutrition setup intake form: coach requests, client submits favorite foods,
-- current macros, allergies, and notes before meal plan setup.

alter table public.client_nutrition_profiles
  add column if not exists setup_form_requested_at timestamptz,
  add column if not exists setup_form_completed_at timestamptz,
  add column if not exists favorite_foods text,
  add column if not exists current_calories_kcal numeric(8, 1)
    check (current_calories_kcal is null or current_calories_kcal > 0),
  add column if not exists current_protein_g numeric(8, 1)
    check (current_protein_g is null or current_protein_g > 0),
  add column if not exists current_carbs_g numeric(8, 1)
    check (current_carbs_g is null or current_carbs_g > 0),
  add column if not exists current_fat_g numeric(8, 1)
    check (current_fat_g is null or current_fat_g > 0);

comment on column public.client_nutrition_profiles.setup_form_requested_at is
  'When the coach last requested the client complete the nutrition setup form.';
comment on column public.client_nutrition_profiles.setup_form_completed_at is
  'When the client last submitted the nutrition setup form.';
comment on column public.client_nutrition_profiles.favorite_foods is
  'Client-reported favorite foods and meals for meal planning.';
comment on column public.client_nutrition_profiles.current_calories_kcal is
  'Client-reported current daily calorie intake (not coach targets).';
comment on column public.client_nutrition_profiles.current_protein_g is
  'Client-reported current daily protein intake in grams.';
comment on column public.client_nutrition_profiles.current_carbs_g is
  'Client-reported current daily carbohydrate intake in grams.';
comment on column public.client_nutrition_profiles.current_fat_g is
  'Client-reported current daily fat intake in grams.';
