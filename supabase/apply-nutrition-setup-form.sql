-- Nutrition setup intake form: apply after nutrition migrations
-- Paste into Supabase SQL editor or run via supabase db push

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
