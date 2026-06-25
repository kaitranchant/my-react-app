import type { MealPlanSummary } from '@/lib/meal-plan-stats'

export type MealPlanTargetAlignment = {
  planCalories: number
  targetCalories: number
  deltaKcal: number
  percentOfTarget: number
  isMisaligned: boolean
}

const MISALIGNMENT_THRESHOLD = 0.8

export function assessMealPlanTargetAlignment(
  summary: MealPlanSummary,
  targetCalories: number | null | undefined
): MealPlanTargetAlignment | null {
  const planCalories = summary.avgDailyMacros?.caloriesKcal
  if (planCalories == null || planCalories <= 0 || targetCalories == null || targetCalories <= 0) {
    return null
  }

  const deltaKcal = planCalories - targetCalories
  const percentOfTarget = Math.round((planCalories / targetCalories) * 100)

  return {
    planCalories,
    targetCalories,
    deltaKcal,
    percentOfTarget,
    isMisaligned: planCalories < targetCalories * MISALIGNMENT_THRESHOLD,
  }
}

export function formatMealPlanTargetWarning(
  alignment: MealPlanTargetAlignment
): string {
  const delta = Math.abs(alignment.deltaKcal)
  if (alignment.deltaKcal < 0) {
    return `${alignment.planCalories.toLocaleString()} kcal is ${delta.toLocaleString()} below the ${alignment.targetCalories.toLocaleString()} target. Consider adding meals.`
  }

  return `${alignment.planCalories.toLocaleString()} kcal is ${delta.toLocaleString()} above the ${alignment.targetCalories.toLocaleString()} target.`
}
