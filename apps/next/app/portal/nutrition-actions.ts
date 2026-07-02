'use server'

import { revalidatePath } from 'next/cache'

import {
  normalizeSupplements,
  nutritionLogValuesToRow,
  nutritionProfileToFormValues,
  preserveNutritionIntakeFields,
} from '@/lib/nutrition'
import { requirePortalClientContext } from '@/lib/portal-client'
import {
  clientNutritionNotesSchema,
  foodDiaryEntryFormSchema,
  nutritionLogFormSchema,
  nutritionSetupFormSchema,
  type ClientNutritionNotesFormValues,
  type FoodDiaryEntryFormValues,
  type NutritionLogFormValues,
  type NutritionSetupFormValues,
} from '@/lib/validations/nutrition'

export type ActionResult = { success: true } | { success: false; error: string }

function revalidatePortalNutrition(clientId: string) {
  revalidatePath('/portal', 'layout')
  revalidatePath('/portal/nutrition')
  revalidatePath('/portal/goals')
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
}

export async function submitNutritionLog(
  values: NutritionLogFormValues
): Promise<ActionResult> {
  const parsed = nutritionLogFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: coachClient, error: clientError } = await ctx.supabase
    .from('clients')
    .select('coach_id')
    .eq('id', ctx.client.id)
    .maybeSingle()

  if (clientError || !coachClient?.coach_id) {
    return { success: false, error: 'Client profile not found.' }
  }

  const row = nutritionLogValuesToRow(
    parsed.data,
    ctx.client.id,
    coachClient.coach_id
  )

  const { error } = await ctx.supabase
    .from('client_nutrition_logs')
    .upsert(row, { onConflict: 'client_id,log_date' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortalNutrition(ctx.client.id)
  return { success: true }
}

export async function addFoodDiaryEntry(
  values: FoodDiaryEntryFormValues
): Promise<ActionResult> {
  const parsed = foodDiaryEntryFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: coachClient, error: clientError } = await ctx.supabase
    .from('clients')
    .select('coach_id')
    .eq('id', ctx.client.id)
    .maybeSingle()

  if (clientError || !coachClient?.coach_id) {
    return { success: false, error: 'Client profile not found.' }
  }

  const { error } = await ctx.supabase.from('client_food_diary_entries').insert({
    client_id: ctx.client.id,
    coach_id: coachClient.coach_id,
    log_date: parsed.data.logDate,
    meal_type: parsed.data.mealType,
    food_name: parsed.data.foodName,
    source: parsed.data.source ?? null,
    external_id: parsed.data.externalId ?? null,
    quantity_g: parsed.data.quantityG ?? null,
    calories_kcal: parsed.data.caloriesKcal,
    protein_g: parsed.data.proteinG,
    carbs_g: parsed.data.carbsG,
    fat_g: parsed.data.fatG,
    fiber_g: parsed.data.fiberG,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortalNutrition(ctx.client.id)
  return { success: true }
}

export async function deleteFoodDiaryEntry(
  entryId: string
): Promise<ActionResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { error } = await ctx.supabase
    .from('client_food_diary_entries')
    .delete()
    .eq('id', entryId)
    .eq('client_id', ctx.client.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortalNutrition(ctx.client.id)
  return { success: true }
}

export async function updateClientNutritionNotes(
  values: ClientNutritionNotesFormValues
): Promise<ActionResult> {
  const parsed = clientNutritionNotesSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: coachClient, error: clientError } = await ctx.supabase
    .from('clients')
    .select('coach_id')
    .eq('id', ctx.client.id)
    .maybeSingle()

  if (clientError || !coachClient?.coach_id) {
    return { success: false, error: 'Client profile not found.' }
  }

  const { data: existingProfile } = await ctx.supabase
    .from('client_nutrition_profiles')
    .select('*')
    .eq('client_id', ctx.client.id)
    .maybeSingle()

  const baseValues = nutritionProfileToFormValues(existingProfile)
  const row = {
    client_id: ctx.client.id,
    coach_id: coachClient.coach_id,
    calories_kcal: baseValues.caloriesKcal,
    protein_g: baseValues.proteinG,
    carbs_g: baseValues.carbsG,
    fat_g: baseValues.fatG,
    fiber_g: baseValues.fiberG,
    water_ml: baseValues.waterMl,
    notes: baseValues.notes,
    dietary_restrictions: baseValues.dietaryRestrictions,
    supplements: normalizeSupplements(baseValues.supplements),
    ...preserveNutritionIntakeFields(existingProfile),
    client_nutrition_notes: parsed.data.clientNutritionNotes,
  }

  const { error } = await ctx.supabase
    .from('client_nutrition_profiles')
    .upsert(row, { onConflict: 'client_id' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePortalNutrition(ctx.client.id)
  return { success: true }
}

export async function submitNutritionSetupForm(
  values: NutritionSetupFormValues
): Promise<ActionResult> {
  const parsed = nutritionSetupFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: coachClient, error: clientError } = await ctx.supabase
    .from('clients')
    .select('coach_id, full_name')
    .eq('id', ctx.client.id)
    .maybeSingle()

  if (clientError || !coachClient?.coach_id) {
    return { success: false, error: 'Client profile not found.' }
  }

  const { data: existingProfile } = await ctx.supabase
    .from('client_nutrition_profiles')
    .select('*')
    .eq('client_id', ctx.client.id)
    .maybeSingle()

  if (!existingProfile?.setup_form_requested_at) {
    return {
      success: false,
      error: 'Your coach has not requested a nutrition setup form.',
    }
  }

  const cleanedSupplements = normalizeSupplements(
    parsed.data.supplements.filter((supplement) => supplement.name.trim())
  )
  const baseValues = nutritionProfileToFormValues(existingProfile)
  const now = new Date().toISOString()

  const row = {
    client_id: ctx.client.id,
    coach_id: coachClient.coach_id,
    calories_kcal: baseValues.caloriesKcal,
    protein_g: baseValues.proteinG,
    carbs_g: baseValues.carbsG,
    fat_g: baseValues.fatG,
    fiber_g: baseValues.fiberG,
    water_ml: baseValues.waterMl,
    notes: baseValues.notes,
    dietary_restrictions: parsed.data.dietaryRestrictions,
    supplements: cleanedSupplements,
    client_nutrition_notes: parsed.data.additionalNotes,
    favorite_foods: parsed.data.favoriteFoods,
    setup_goal: parsed.data.setupGoal,
    body_weight_lbs: parsed.data.bodyWeightLbs,
    height_in: parsed.data.heightIn,
    age_years: parsed.data.ageYears,
    setup_biological_sex: parsed.data.setupBiologicalSex,
    activity_level: parsed.data.activityLevel,
    meal_frequency: parsed.data.mealFrequency,
    cooking_time_skill: parsed.data.cookingTimeSkill,
    budget_constraints: parsed.data.budgetConstraints,
    food_dislikes: parsed.data.foodDislikes,
    grocery_access: parsed.data.groceryAccess,
    current_calories_kcal: parsed.data.currentCaloriesKcal,
    current_protein_g: parsed.data.currentProteinG,
    current_carbs_g: parsed.data.currentCarbsG,
    current_fat_g: parsed.data.currentFatG,
    setup_form_requested_at: existingProfile.setup_form_requested_at,
    setup_form_completed_at: now,
  }

  const { error } = await ctx.supabase
    .from('client_nutrition_profiles')
    .upsert(row, { onConflict: 'client_id' })

  if (error) {
    return { success: false, error: error.message }
  }

  const { notifyCoachOfNutritionSetupSubmission } = await import(
    '@/lib/notifications/notify-coach-nutrition-setup'
  )
  void notifyCoachOfNutritionSetupSubmission({
    coachId: coachClient.coach_id,
    clientId: ctx.client.id,
    clientName:
      coachClient.full_name?.trim() || ctx.client.full_name || 'Client',
  })

  revalidatePortalNutrition(ctx.client.id)
  return { success: true }
}
