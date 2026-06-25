import type { SupabaseClient } from '@supabase/supabase-js'

import type { MealPlanDayWithMeals } from 'app/types/database'

export type ExtendMealPlanResult =
  | { success: true; daysAdded: number }
  | { success: false; error: string }

export async function appendDuplicatedMealPlanDays(
  supabase: SupabaseClient,
  mealPlanId: string,
  days: MealPlanDayWithMeals[]
): Promise<ExtendMealPlanResult> {
  if (days.length === 0) {
    return { success: false, error: 'No days to duplicate.' }
  }

  const sortedDays = [...days].sort(
    (left, right) => left.day_offset - right.day_offset
  )
  const minOffset = sortedDays[0]!.day_offset
  const maxOffset = sortedDays[sortedDays.length - 1]!.day_offset
  const baseNewOffset = maxOffset + 1

  for (const sourceDay of sortedDays) {
    const newOffset = baseNewOffset + (sourceDay.day_offset - minOffset)

    const { data: newDay, error: dayError } = await supabase
      .from('meal_plan_days')
      .insert({
        meal_plan_id: mealPlanId,
        day_offset: newOffset,
        label: sourceDay.label,
        notes: sourceDay.notes,
      })
      .select('id')
      .single()

    if (dayError || !newDay) {
      return {
        success: false,
        error: dayError?.message ?? 'Could not duplicate plan day.',
      }
    }

    for (const sourceMeal of sourceDay.meals) {
      const { data: newMeal, error: mealError } = await supabase
        .from('meal_plan_meals')
        .insert({
          meal_plan_day_id: newDay.id,
          meal_type: sourceMeal.meal_type,
          name: sourceMeal.name,
          description: sourceMeal.description,
          calories_kcal: sourceMeal.calories_kcal,
          protein_g: sourceMeal.protein_g,
          carbs_g: sourceMeal.carbs_g,
          fat_g: sourceMeal.fat_g,
          sort_order: sourceMeal.sort_order,
        })
        .select('id')
        .single()

      if (mealError || !newMeal) {
        return {
          success: false,
          error: mealError?.message ?? 'Could not duplicate plan meal.',
        }
      }

      if (sourceMeal.foods.length > 0) {
        const foodRows = sourceMeal.foods.map((food) => ({
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

        const { error: foodsError } = await supabase
          .from('meal_plan_meal_foods')
          .insert(foodRows)

        if (foodsError) {
          return { success: false, error: foodsError.message }
        }
      }
    }
  }

  return { success: true, daysAdded: sortedDays.length }
}
