'use server'

import { revalidatePath } from 'next/cache'

import { sumMealPlanMealFoodMacros } from '@/lib/meal-plan-meal-foods'
import { createClient } from '@/lib/supabase/server'
import {
  libraryMealUpdateSchema,
  type LibraryMealUpdateValues,
} from '@/lib/validations/meal-library'
import {
  mealPlanMealFoodFormSchema,
  type MealPlanMealFoodFormValues,
} from '@/lib/validations/nutrition'

export type ActionResult = { success: true } | { success: false; error: string }

async function requireLibraryMealOwner(mealId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: meal, error } = await supabase
    .from('library_meals')
    .select('id, name, meal_type')
    .eq('id', mealId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !meal) {
    return null
  }

  return { supabase, user, mealId, meal }
}

function revalidateLibraryMealEditor(mealId: string) {
  revalidatePath(`/library/meals/${mealId}`)
  revalidatePath('/library/meals')
  revalidatePath('/library')
}

function libraryFoodValuesToRow(
  libraryMealId: string,
  food: MealPlanMealFoodFormValues,
  sortOrder: number
) {
  return {
    library_meal_id: libraryMealId,
    sort_order: sortOrder,
    food_name: food.foodName,
    source: food.source,
    external_id: food.externalId ?? null,
    quantity_g: food.quantityG,
    calories_kcal: food.caloriesKcal,
    protein_g: food.proteinG,
    carbs_g: food.carbsG,
    fat_g: food.fatG,
  }
}

async function syncLibraryMealMacrosFromFoods(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mealId: string
) {
  const { data: foods, error } = await supabase
    .from('library_meal_foods')
    .select('calories_kcal, protein_g, carbs_g, fat_g')
    .eq('library_meal_id', mealId)

  if (error) {
    throw new Error(error.message)
  }

  const totals = sumMealPlanMealFoodMacros(foods ?? [])
  const { error: updateError } = await supabase
    .from('library_meals')
    .update({
      calories_kcal: totals.caloriesKcal,
      protein_g: totals.proteinG,
      carbs_g: totals.carbsG,
      fat_g: totals.fatG,
    })
    .eq('id', mealId)

  if (updateError) {
    throw new Error(updateError.message)
  }
}

export async function updateLibraryMealRecord(
  mealId: string,
  values: LibraryMealUpdateValues
): Promise<ActionResult> {
  const parsed = libraryMealUpdateSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireLibraryMealOwner(mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const updates: {
    name?: string
    description?: string | null
    meal_type?: LibraryMealUpdateValues['mealType']
  } = {}

  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name.trim()
  }
  if (parsed.data.description !== undefined) {
    updates.description = parsed.data.description
  }
  if (parsed.data.mealType !== undefined) {
    updates.meal_type = parsed.data.mealType
  }

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error } = await ctx.supabase
    .from('library_meals')
    .update(updates)
    .eq('id', mealId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateLibraryMealEditor(mealId)
  return { success: true }
}

export async function addLibraryMealFood(
  mealId: string,
  values: MealPlanMealFoodFormValues
): Promise<ActionResult> {
  const parsed = mealPlanMealFoodFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireLibraryMealOwner(mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const { count, error: countError } = await ctx.supabase
    .from('library_meal_foods')
    .select('id', { count: 'exact', head: true })
    .eq('library_meal_id', mealId)

  if (countError) {
    return { success: false, error: countError.message }
  }

  const { error } = await ctx.supabase.from('library_meal_foods').insert(
    libraryFoodValuesToRow(mealId, parsed.data, count ?? 0)
  )

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await syncLibraryMealMacrosFromFoods(ctx.supabase, mealId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not update meal macros.',
    }
  }

  revalidateLibraryMealEditor(mealId)
  return { success: true }
}

export async function updateLibraryMealFood(
  mealId: string,
  foodId: string,
  values: MealPlanMealFoodFormValues
): Promise<ActionResult> {
  const parsed = mealPlanMealFoodFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const ctx = await requireLibraryMealOwner(mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const { data: existingFood, error: foodError } = await ctx.supabase
    .from('library_meal_foods')
    .select('id')
    .eq('id', foodId)
    .eq('library_meal_id', mealId)
    .maybeSingle()

  if (foodError || !existingFood) {
    return { success: false, error: 'Food not found.' }
  }

  const { error } = await ctx.supabase
    .from('library_meal_foods')
    .update({
      food_name: parsed.data.foodName,
      source: parsed.data.source,
      external_id: parsed.data.externalId ?? null,
      quantity_g: parsed.data.quantityG,
      calories_kcal: parsed.data.caloriesKcal,
      protein_g: parsed.data.proteinG,
      carbs_g: parsed.data.carbsG,
      fat_g: parsed.data.fatG,
    })
    .eq('id', foodId)
    .eq('library_meal_id', mealId)

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await syncLibraryMealMacrosFromFoods(ctx.supabase, mealId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not update meal macros.',
    }
  }

  revalidateLibraryMealEditor(mealId)
  return { success: true }
}

export async function deleteLibraryMealFood(
  mealId: string,
  foodId: string
): Promise<ActionResult> {
  const ctx = await requireLibraryMealOwner(mealId)
  if (!ctx) {
    return { success: false, error: 'Meal not found.' }
  }

  const { error } = await ctx.supabase
    .from('library_meal_foods')
    .delete()
    .eq('id', foodId)
    .eq('library_meal_id', mealId)

  if (error) {
    return { success: false, error: error.message }
  }

  try {
    await syncLibraryMealMacrosFromFoods(ctx.supabase, mealId)
  } catch (syncError) {
    return {
      success: false,
      error:
        syncError instanceof Error
          ? syncError.message
          : 'Could not update meal macros.',
    }
  }

  revalidateLibraryMealEditor(mealId)
  return { success: true }
}
