import type { MealPlanMealFood } from 'app/types/database'

export type MealMacroTotals = {
  caloriesKcal: number | null
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
}

export function sumMealPlanMealFoodMacros(
  foods: Pick<
    MealPlanMealFood,
    'calories_kcal' | 'protein_g' | 'carbs_g' | 'fat_g'
  >[]
): MealMacroTotals {
  if (foods.length === 0) {
    return {
      caloriesKcal: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
    }
  }

  const totals = foods.reduce(
    (acc, food) => ({
      caloriesKcal: acc.caloriesKcal + (food.calories_kcal ?? 0),
      proteinG: acc.proteinG + (food.protein_g ?? 0),
      carbsG: acc.carbsG + (food.carbs_g ?? 0),
      fatG: acc.fatG + (food.fat_g ?? 0),
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  )

  return {
    caloriesKcal: roundMacro(totals.caloriesKcal),
    proteinG: roundMacro(totals.proteinG),
    carbsG: roundMacro(totals.carbsG),
    fatG: roundMacro(totals.fatG),
  }
}

function roundMacro(value: number) {
  return Math.round(value * 10) / 10
}
