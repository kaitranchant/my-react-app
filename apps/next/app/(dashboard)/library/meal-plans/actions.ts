'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import {
  mealPlanFormSchema,
  type MealPlanFormValues,
} from '@/lib/validations/nutrition'
import type { MealPlanStatus } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateMealPlanResult =
  | { success: true; mealPlanId: string }
  | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

function toMealPlanRow(values: MealPlanFormValues) {
  return {
    name: values.name,
    description: values.description ? values.description : null,
    status: values.status,
  }
}

function revalidateMealPlans(mealPlanId?: string) {
  revalidatePath('/library/meal-plans')
  revalidatePath('/library')
  if (mealPlanId) {
    revalidatePath(`/library/meal-plans/${mealPlanId}`)
  }
}

export async function createMealPlanRecord(
  values: MealPlanFormValues
): Promise<CreateMealPlanResult> {
  const parsed = mealPlanFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({ ...toMealPlanRow(parsed.data), coach_id: user.id })
    .select('id')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? 'Could not create meal plan.',
    }
  }

  revalidateMealPlans(data.id)
  return { success: true, mealPlanId: data.id }
}

export async function updateMealPlanRecord(
  id: string,
  values: MealPlanFormValues
): Promise<ActionResult> {
  const parsed = mealPlanFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('meal_plans')
    .update(toMealPlanRow(parsed.data))
    .eq('id', id)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMealPlans(id)
  return { success: true }
}

export async function setMealPlanStatus(
  id: string,
  status: MealPlanStatus
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('meal_plans')
    .update({ status })
    .eq('id', id)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMealPlans(id)
  return { success: true }
}

export async function deleteMealPlanRecord(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', id)
    .eq('coach_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMealPlans()
  return { success: true }
}
