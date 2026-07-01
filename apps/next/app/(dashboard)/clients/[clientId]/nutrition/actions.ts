'use server'

import { revalidatePath } from 'next/cache'

import {
  assignMealPlanToClientInternal,
  cancelMealPlanAssignmentInternal,
} from '@/lib/meal-plan-assignment'
import { fetchMealPlanDaysWithMeals } from '@/lib/meal-plan-data.server'
import { appendDuplicatedMealPlanDays } from '@/lib/meal-plan-extend'
import {
  nutritionLogValuesToRow,
  nutritionProfileToFormValues,
  nutritionProfileValuesToRow,
  normalizeSupplements,
  preserveNutritionIntakeFields,
} from '@/lib/nutrition'
import { requireClientAccess } from '@/lib/gym-access'
import {
  mealPlanAssignmentFormSchema,
  clientMealPlanFormSchema,
  nutritionProfileFormSchema,
  type ClientMealPlanFormValues,
  type FoodDiaryEntryFormValues,
  type NutritionProfileFormValues,
  foodDiaryEntryFormSchema,
  nutritionLogFormSchema,
  type NutritionLogFormValues,
} from '@/lib/validations/nutrition'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateClientMealPlanResult =
  | { success: true; mealPlanId: string }
  | { success: false; error: string }

function revalidateNutritionPaths(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/portal/nutrition')
  revalidatePath('/portal', 'layout')
  revalidatePath('/portal/goals')
}

export async function updateClientNutritionProfile(
  clientId: string,
  values: NutritionProfileFormValues
): Promise<ActionResult> {
  const parsed = nutritionProfileFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const supplements = parsed.data.supplements.filter((s) => s.name.trim())

  const { data: existingProfile } = await ctx.supabase
    .from('client_nutrition_profiles')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  const row = {
    ...nutritionProfileValuesToRow(
      { ...parsed.data, supplements: normalizeSupplements(supplements) },
      clientId,
      ctx.user.id
    ),
    ...preserveNutritionIntakeFields(existingProfile),
  }

  const { error } = await ctx.supabase
    .from('client_nutrition_profiles')
    .upsert(row, { onConflict: 'client_id' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateNutritionPaths(clientId)
  return { success: true }
}

export async function assignMealPlanToClient(
  clientId: string,
  values: { mealPlanId: string; startDate: string }
): Promise<ActionResult> {
  const parsed = mealPlanAssignmentFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const result = await assignMealPlanToClientInternal(ctx.supabase, {
    coachId: ctx.user.id,
    clientId,
    mealPlanId: parsed.data.mealPlanId,
    startDate: parsed.data.startDate,
  })

  if (!result.success) {
    return result
  }

  revalidateNutritionPaths(clientId)
  revalidatePath('/library/meal-plans')
  return { success: true }
}

export async function createClientMealPlan(
  clientId: string,
  values: ClientMealPlanFormValues
): Promise<CreateClientMealPlanResult> {
  const parsed = clientMealPlanFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { data: mealPlan, error: createError } = await ctx.supabase
    .from('meal_plans')
    .insert({
      coach_id: ctx.user.id,
      client_id: clientId,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || null,
      status: 'active',
    })
    .select('id')
    .single()

  if (createError || !mealPlan) {
    return {
      success: false,
      error: createError?.message ?? 'Could not create meal plan.',
    }
  }

  const assignResult = await assignMealPlanToClientInternal(ctx.supabase, {
    coachId: ctx.user.id,
    clientId,
    mealPlanId: mealPlan.id,
    startDate: parsed.data.startDate,
  })

  if (!assignResult.success) {
    await ctx.supabase.from('meal_plans').delete().eq('id', mealPlan.id)
    return assignResult
  }

  revalidateNutritionPaths(clientId)
  revalidatePath('/library/meal-plans')
  revalidatePath(`/library/meal-plans/${mealPlan.id}`)
  return { success: true, mealPlanId: mealPlan.id }
}

export async function addClientFoodDiaryEntry(
  clientId: string,
  values: FoodDiaryEntryFormValues
): Promise<ActionResult> {
  const parsed = foodDiaryEntryFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { error } = await ctx.supabase.from('client_food_diary_entries').insert({
    client_id: clientId,
    coach_id: ctx.user.id,
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

  revalidateNutritionPaths(clientId)
  return { success: true }
}

export async function deleteClientFoodDiaryEntry(
  clientId: string,
  entryId: string
): Promise<ActionResult> {
  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { error } = await ctx.supabase
    .from('client_food_diary_entries')
    .delete()
    .eq('id', entryId)
    .eq('client_id', clientId)
    .eq('coach_id', ctx.user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateNutritionPaths(clientId)
  return { success: true }
}

export async function extendMealPlanAssignment(
  clientId: string
): Promise<ActionResult> {
  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { data: assignment, error: assignmentError } = await ctx.supabase
    .from('meal_plan_assignments')
    .select('id, meal_plan_id')
    .eq('client_id', clientId)
    .eq('coach_id', ctx.user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (assignmentError || !assignment) {
    return { success: false, error: 'No active meal plan assignment found.' }
  }

  const planDays = await fetchMealPlanDaysWithMeals(
    ctx.supabase,
    assignment.meal_plan_id
  )

  const result = await appendDuplicatedMealPlanDays(
    ctx.supabase,
    assignment.meal_plan_id,
    planDays
  )

  if (!result.success) {
    return result
  }

  await ctx.supabase
    .from('meal_plans')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', assignment.meal_plan_id)
    .eq('coach_id', ctx.user.id)

  revalidateNutritionPaths(clientId)
  revalidatePath('/library/meal-plans')
  revalidatePath(`/library/meal-plans/${assignment.meal_plan_id}`)
  return { success: true }
}

export async function submitClientNutritionLog(
  clientId: string,
  values: NutritionLogFormValues
): Promise<ActionResult> {
  const parsed = nutritionLogFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const row = nutritionLogValuesToRow(parsed.data, clientId, ctx.user.id)

  const { error } = await ctx.supabase
    .from('client_nutrition_logs')
    .upsert(row, { onConflict: 'client_id,log_date' })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateNutritionPaths(clientId)
  return { success: true }
}

export async function cancelMealPlanAssignment(
  clientId: string
): Promise<ActionResult> {
  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const result = await cancelMealPlanAssignmentInternal(ctx.supabase, {
    coachId: ctx.user.id,
    clientId,
  })

  if (!result.success) {
    return result
  }

  revalidateNutritionPaths(clientId)
  revalidatePath('/library/meal-plans')
  return { success: true }
}

export async function requestNutritionSetupForm(
  clientId: string
): Promise<ActionResult> {
  const ctx = await requireClientAccess(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { data: client, error: clientError } = await ctx.supabase
    .from('clients')
    .select('id, user_id')
    .eq('id', clientId)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client not found.' }
  }

  if (!client.user_id) {
    return {
      success: false,
      error: 'Invite this client to the portal before sending the setup form.',
    }
  }

  const { data: existingProfile } = await ctx.supabase
    .from('client_nutrition_profiles')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  const baseValues = nutritionProfileToFormValues(existingProfile)
  const now = new Date().toISOString()

  const row = {
    ...nutritionProfileValuesToRow(baseValues, clientId, ctx.user.id),
    ...preserveNutritionIntakeFields(existingProfile),
    setup_form_requested_at: now,
  }

  const { error } = await ctx.supabase
    .from('client_nutrition_profiles')
    .upsert(row, { onConflict: 'client_id' })

  if (error) {
    return { success: false, error: error.message }
  }

  const { notifyClientOfNutritionSetupRequest } = await import(
    '@/lib/notifications/notify-client-nutrition-setup'
  )
  void notifyClientOfNutritionSetupRequest({
    clientId,
    coachId: ctx.user.id,
  })

  revalidateNutritionPaths(clientId)
  return { success: true }
}
