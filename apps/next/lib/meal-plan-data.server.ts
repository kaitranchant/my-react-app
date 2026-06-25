import type { SupabaseClient } from '@supabase/supabase-js'

import { groupDaysWithMeals } from '@/lib/nutrition'
import type {
  MealPlanDay,
  MealPlanDayWithMeals,
  MealPlanMeal,
  MealPlanMealFood,
} from 'app/types/database'

export async function fetchMealPlanDaysWithMeals(
  supabase: SupabaseClient,
  mealPlanId: string
): Promise<MealPlanDayWithMeals[]> {
  const { data: daysData } = await supabase
    .from('meal_plan_days')
    .select('*')
    .eq('meal_plan_id', mealPlanId)
    .order('day_offset', { ascending: true })

  const dayIds = (daysData ?? []).map((day) => day.id)
  let mealsData: MealPlanMeal[] = []
  let mealFoodsData: MealPlanMealFood[] = []

  if (dayIds.length > 0) {
    const { data: meals } = await supabase
      .from('meal_plan_meals')
      .select('*')
      .in('meal_plan_day_id', dayIds)
      .order('sort_order', { ascending: true })

    mealsData = (meals ?? []) as MealPlanMeal[]

    const mealIds = mealsData.map((meal) => meal.id)
    if (mealIds.length > 0) {
      const { data: mealFoods } = await supabase
        .from('meal_plan_meal_foods')
        .select('*')
        .in('meal_plan_meal_id', mealIds)
        .order('sort_order', { ascending: true })

      mealFoodsData = (mealFoods ?? []) as MealPlanMealFood[]
    }
  }

  return groupDaysWithMeals(
    (daysData ?? []) as MealPlanDay[],
    mealsData,
    mealFoodsData
  )
}
