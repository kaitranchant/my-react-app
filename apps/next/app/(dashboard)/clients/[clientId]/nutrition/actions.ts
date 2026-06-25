'use server'

import { revalidatePath } from 'next/cache'

import {
  assignMealPlanToClientInternal,
  cancelMealPlanAssignmentInternal,
} from '@/lib/meal-plan-assignment'
import { nutritionProfileValuesToRow, normalizeSupplements } from '@/lib/nutrition'
import { requireClientAccess } from '@/lib/gym-access'
import {
  mealPlanAssignmentFormSchema,
  clientMealPlanFormSchema,
  nutritionProfileFormSchema,
  type ClientMealPlanFormValues,
  type NutritionProfileFormValues,
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

  const row = nutritionProfileValuesToRow(
    { ...parsed.data, supplements: normalizeSupplements(supplements) },
    clientId,
    ctx.user.id
  )

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
