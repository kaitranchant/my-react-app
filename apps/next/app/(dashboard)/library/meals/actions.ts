'use server'

import { revalidatePath } from 'next/cache'

import {
  parseMealLibraryCalorieRange,
  parseMealLibraryCarbsRange,
  parseMealLibraryFatRange,
  parseMealLibraryProteinRange,
} from '@/lib/meal-library-filters'
import { fetchActiveLibraryMealsForPicker } from '@/lib/meal-library-data.server'
import { sumMealPlanMealFoodMacros } from '@/lib/meal-plan-meal-foods'
import { createClient } from '@/lib/supabase/server'
import {
  libraryMealFormSchema,
  libraryMealStatuses,
  type LibraryMealFormValues,
} from '@/lib/validations/meal-library'
import type { ExerciseStatus, LibraryMeal, MealType } from 'app/types/database'

export type ActionResult = { success: true } | { success: false; error: string }

export type CreateLibraryMealResult =
  | { success: true; mealId: string }
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

function revalidateLibraryMeals(mealId?: string) {
  revalidatePath('/library/meals')
  revalidatePath('/library')
  if (mealId) {
    revalidatePath(`/library/meals/${mealId}`)
  }
}

function foodValuesToRow(
  libraryMealId: string,
  food: LibraryMealFormValues['foods'][number],
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

export async function createLibraryMealRecord(
  values: LibraryMealFormValues
): Promise<CreateLibraryMealResult> {
  const parsed = libraryMealFormSchema.safeParse(values)
  if (!parsed.success) {
    return { success: false, error: 'Please check the form and try again.' }
  }

  const { supabase, user } = await requireUser()
  const foods = parsed.data.foods
  const macroTotals = sumMealPlanMealFoodMacros(
    foods.map((food) => ({
      calories_kcal: food.caloriesKcal,
      protein_g: food.proteinG,
      carbs_g: food.carbsG,
      fat_g: food.fatG,
    }))
  )

  const { data: meal, error } = await supabase
    .from('library_meals')
    .insert({
      coach_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ? parsed.data.description : null,
      meal_type: parsed.data.mealType,
      status: parsed.data.status,
      calories_kcal: macroTotals.caloriesKcal,
      protein_g: macroTotals.proteinG,
      carbs_g: macroTotals.carbsG,
      fat_g: macroTotals.fatG,
    })
    .select('id')
    .single()

  if (error || !meal) {
    return { success: false, error: error?.message ?? 'Could not create meal.' }
  }

  if (foods.length > 0) {
    const { error: foodsError } = await supabase.from('library_meal_foods').insert(
      foods.map((food, index) => foodValuesToRow(meal.id, food, index))
    )

    if (foodsError) {
      await supabase.from('library_meals').delete().eq('id', meal.id)
      return { success: false, error: foodsError.message }
    }
  }

  revalidateLibraryMeals(meal.id)
  return { success: true, mealId: meal.id }
}

export async function setLibraryMealStatus(
  id: string,
  status: ExerciseStatus
): Promise<ActionResult> {
  if (!libraryMealStatuses.includes(status)) {
    return { success: false, error: 'Invalid status.' }
  }

  const { supabase } = await requireUser()
  const { error } = await supabase
    .from('library_meals')
    .update({ status })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateLibraryMeals(id)
  return { success: true }
}

export async function deleteLibraryMealRecord(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('library_meals').delete().eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateLibraryMeals()
  return { success: true }
}

export type GetLibraryMealsForPickerResult =
  | { success: true; meals: LibraryMeal[] }
  | { success: false; error: string }

export async function getLibraryMealsForPicker(filters: {
  mealType?: MealType
  calorieRange?: string
  proteinRange?: string
  carbsRange?: string
  fatRange?: string
  q?: string
}): Promise<GetLibraryMealsForPickerResult> {
  const { supabase, user } = await requireUser()

  try {
    const meals = await fetchActiveLibraryMealsForPicker(supabase, user.id, {
      mealType: filters.mealType,
      calorieRange: parseMealLibraryCalorieRange(filters.calorieRange) ?? undefined,
      proteinRange: parseMealLibraryProteinRange(filters.proteinRange) ?? undefined,
      carbsRange: parseMealLibraryCarbsRange(filters.carbsRange) ?? undefined,
      fatRange: parseMealLibraryFatRange(filters.fatRange) ?? undefined,
      q: filters.q,
    })
    return { success: true, meals }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Could not load meals.',
    }
  }
}
