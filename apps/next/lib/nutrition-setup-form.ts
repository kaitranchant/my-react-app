import type { ClientNutritionProfile } from 'app/types/database'

type SetupFormTimestamps = Pick<
  ClientNutritionProfile,
  'setup_form_requested_at' | 'setup_form_completed_at'
>

export function isNutritionSetupFormDue(
  profile: SetupFormTimestamps | null
): boolean {
  if (!profile?.setup_form_requested_at) {
    return false
  }

  if (!profile.setup_form_completed_at) {
    return true
  }

  return (
    new Date(profile.setup_form_completed_at).getTime() <
    new Date(profile.setup_form_requested_at).getTime()
  )
}

export function hasNutritionSetupIntake(
  profile: ClientNutritionProfile | null
): boolean {
  if (!profile?.setup_form_completed_at) {
    return false
  }

  return (
    Boolean(profile.favorite_foods?.trim()) ||
    profile.setup_goal != null ||
    profile.body_weight_lbs != null ||
    profile.height_in != null ||
    profile.age_years != null ||
    profile.setup_biological_sex != null ||
    profile.activity_level != null ||
    Boolean(profile.meal_frequency?.trim()) ||
    Boolean(profile.cooking_time_skill?.trim()) ||
    Boolean(profile.budget_constraints?.trim()) ||
    Boolean(profile.food_dislikes?.trim()) ||
    Boolean(profile.grocery_access?.trim()) ||
    profile.current_calories_kcal != null ||
    profile.current_protein_g != null ||
    profile.current_carbs_g != null ||
    profile.current_fat_g != null ||
    Boolean(profile.dietary_restrictions?.trim()) ||
    (Array.isArray(profile.supplements) && profile.supplements.length > 0) ||
    Boolean(profile.client_nutrition_notes?.trim())
  )
}

export function formatSetupFormDate(iso: string | null): string | null {
  if (!iso) {
    return null
  }

  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
