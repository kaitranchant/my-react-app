import { sumMealPlanMealFoodMacros } from '@/lib/meal-plan-meal-foods'
import type {
  MealPlanDayWithMeals,
  MealPlanMeal,
  MealPlanMealWithFoods,
} from 'app/types/database'

export type MealPlanDayMacros = {
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type MealPlanSummary = {
  dayCount: number
  avgDailyMacros: MealPlanDayMacros | null
  hasMacroData: boolean
}

export function hasMacroTotals(macros: MealPlanDayMacros): boolean {
  return (
    macros.caloriesKcal > 0 ||
    macros.proteinG > 0 ||
    macros.carbsG > 0 ||
    macros.fatG > 0
  )
}

export function getMealMacroTotals(
  meal: MealPlanMealWithFoods
): MealPlanDayMacros | null {
  if (meal.foods.length > 0) {
    const totals = sumMealPlanMealFoodMacros(meal.foods)
    if (totals.caloriesKcal == null) return null

    const macros: MealPlanDayMacros = {
      caloriesKcal: totals.caloriesKcal,
      proteinG: totals.proteinG ?? 0,
      carbsG: totals.carbsG ?? 0,
      fatG: totals.fatG ?? 0,
    }
    return hasMacroTotals(macros) ? macros : null
  }

  const macros: MealPlanDayMacros = {
    caloriesKcal: meal.calories_kcal ?? 0,
    proteinG: meal.protein_g ?? 0,
    carbsG: meal.carbs_g ?? 0,
    fatG: meal.fat_g ?? 0,
  }
  return hasMacroTotals(macros) ? macros : null
}

export function sumDayMacroTotals(
  day: MealPlanDayWithMeals
): MealPlanDayMacros | null {
  const mealTotals = day.meals
    .map(getMealMacroTotals)
    .filter((totals): totals is MealPlanDayMacros => totals != null)

  if (mealTotals.length === 0) return null

  return mealTotals.reduce(
    (acc, totals) => ({
      caloriesKcal: acc.caloriesKcal + totals.caloriesKcal,
      proteinG: acc.proteinG + totals.proteinG,
      carbsG: acc.carbsG + totals.carbsG,
      fatG: acc.fatG + totals.fatG,
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )
}

export function sumMealMacros(meals: MealPlanMeal[]): MealPlanDayMacros {
  return meals.reduce(
    (totals, meal) => ({
      caloriesKcal: totals.caloriesKcal + (meal.calories_kcal ?? 0),
      proteinG: totals.proteinG + (meal.protein_g ?? 0),
      carbsG: totals.carbsG + (meal.carbs_g ?? 0),
      fatG: totals.fatG + (meal.fat_g ?? 0),
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )
}

export function computeMealPlanSummary(
  days: MealPlanDayWithMeals[]
): MealPlanSummary {
  if (days.length === 0) {
    return { dayCount: 0, avgDailyMacros: null, hasMacroData: false }
  }

  const dayTotals = days.map((day) => sumMealMacros(day.meals))
  const hasMacroData = dayTotals.some(
    (totals) =>
      totals.caloriesKcal > 0 ||
      totals.proteinG > 0 ||
      totals.carbsG > 0 ||
      totals.fatG > 0
  )

  if (!hasMacroData) {
    return { dayCount: days.length, avgDailyMacros: null, hasMacroData: false }
  }

  const count = days.length
  const summed = dayTotals.reduce(
    (acc, totals) => ({
      caloriesKcal: acc.caloriesKcal + totals.caloriesKcal,
      proteinG: acc.proteinG + totals.proteinG,
      carbsG: acc.carbsG + totals.carbsG,
      fatG: acc.fatG + totals.fatG,
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  return {
    dayCount: count,
    avgDailyMacros: {
      caloriesKcal: Math.round(summed.caloriesKcal / count),
      proteinG: Math.round(summed.proteinG / count),
      carbsG: Math.round(summed.carbsG / count),
      fatG: Math.round(summed.fatG / count),
    },
    hasMacroData: true,
  }
}

export function formatMealPlanSummary(summary: MealPlanSummary): string | null {
  if (!summary.avgDailyMacros) return null
  const { caloriesKcal, proteinG, carbsG, fatG } = summary.avgDailyMacros
  return `~${caloriesKcal} kcal · ${proteinG}g P · ${carbsG}g C · ${fatG}g F per day`
}
