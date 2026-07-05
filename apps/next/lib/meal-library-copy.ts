import type { SupabaseClient } from '@supabase/supabase-js'

import type { FoodSource, LibraryMealWithFoods } from 'app/types/database'

export type CopiedMealFoodRow = {
  sort_order: number
  food_name: string
  source: FoodSource
  external_id: string | null
  quantity_g: number
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

export type CopyLibraryMealResult =
  | { success: true; mealId: string }
  | { success: false; error: string }

export async function copyLibraryMealToPlanDay(
  supabase: SupabaseClient,
  libraryMeal: LibraryMealWithFoods,
  dayId: string,
  sortOrder: number
): Promise<CopyLibraryMealResult> {
  const { data: newMeal, error: mealError } = await supabase
    .from('meal_plan_meals')
    .insert({
      meal_plan_day_id: dayId,
      meal_type: libraryMeal.meal_type,
      name: libraryMeal.name,
      description: libraryMeal.description,
      calories_kcal: libraryMeal.calories_kcal,
      protein_g: libraryMeal.protein_g,
      carbs_g: libraryMeal.carbs_g,
      fat_g: libraryMeal.fat_g,
      sort_order: sortOrder,
    })
    .select('id')
    .single()

  if (mealError || !newMeal) {
    return {
      success: false,
      error: mealError?.message ?? 'Could not add meal from library.',
    }
  }

  if (libraryMeal.foods.length > 0) {
    const { error: foodsError } = await supabase.from('meal_plan_meal_foods').insert(
      libraryMeal.foods.map((food) => ({
        meal_plan_meal_id: newMeal.id,
        sort_order: food.sort_order,
        food_name: food.food_name,
        source: food.source,
        external_id: food.external_id,
        quantity_g: food.quantity_g,
        calories_kcal: food.calories_kcal,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
      }))
    )

    if (foodsError) {
      await supabase.from('meal_plan_meals').delete().eq('id', newMeal.id)
      return { success: false, error: foodsError.message }
    }
  }

  return { success: true, mealId: newMeal.id }
}

export type CopyPlanMealToLibraryResult =
  | { success: true; libraryMealId: string }
  | { success: false; error: string }

export async function copyPlanMealToLibrary(
  supabase: SupabaseClient,
  coachId: string,
  meal: {
    name: string
    description: string | null
    meal_type: LibraryMealWithFoods['meal_type']
    calories_kcal: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
  },
  foods: CopiedMealFoodRow[]
): Promise<CopyPlanMealToLibraryResult> {
  const { data: libraryMeal, error: mealError } = await supabase
    .from('library_meals')
    .insert({
      coach_id: coachId,
      name: meal.name,
      description: meal.description,
      meal_type: meal.meal_type,
      status: 'active',
      calories_kcal: meal.calories_kcal,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
    })
    .select('id')
    .single()

  if (mealError || !libraryMeal) {
    return {
      success: false,
      error: mealError?.message ?? 'Could not save meal to library.',
    }
  }

  if (foods.length > 0) {
    const { error: foodsError } = await supabase.from('library_meal_foods').insert(
      foods.map((food) => ({
        library_meal_id: libraryMeal.id,
        sort_order: food.sort_order,
        food_name: food.food_name,
        source: food.source,
        external_id: food.external_id,
        quantity_g: food.quantity_g,
        calories_kcal: food.calories_kcal,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
      }))
    )

    if (foodsError) {
      await supabase.from('library_meals').delete().eq('id', libraryMeal.id)
      return { success: false, error: foodsError.message }
    }
  }

  return { success: true, libraryMealId: libraryMeal.id }
}
