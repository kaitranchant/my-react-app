import {
  ACTIVITY_LEVEL_LABELS,
  NUTRITION_GOAL_LABELS,
  type ActivityLevel,
  type NutritionGoal,
} from '@/lib/tdee-calculator'
import type { BiologicalSex, NutritionSetupGoal } from 'app/types/database'

export const NUTRITION_SETUP_GOAL_OPTIONS = [
  'lose',
  'maintain',
  'gain',
  'performance',
] as const satisfies readonly NutritionSetupGoal[]

export const NUTRITION_SETUP_GOAL_LABELS: Record<NutritionSetupGoal, string> = {
  lose: NUTRITION_GOAL_LABELS.lose,
  maintain: NUTRITION_GOAL_LABELS.maintain,
  gain: NUTRITION_GOAL_LABELS.gain,
  performance: 'Performance',
}

export const NUTRITION_SETUP_ACTIVITY_LEVELS = Object.keys(
  ACTIVITY_LEVEL_LABELS
) as ActivityLevel[]

export { ACTIVITY_LEVEL_LABELS }

export const NUTRITION_SETUP_BIOLOGICAL_SEX_OPTIONS = [
  'male',
  'female',
] as const satisfies readonly BiologicalSex[]

export const NUTRITION_SETUP_BIOLOGICAL_SEX_LABELS: Record<BiologicalSex, string> =
  {
    male: 'Male',
    female: 'Female',
  }

export function isNutritionSetupGoal(
  value: string | null | undefined
): value is NutritionSetupGoal {
  return (
    value != null &&
    (NUTRITION_SETUP_GOAL_OPTIONS as readonly string[]).includes(value)
  )
}

export function isNutritionGoal(value: NutritionSetupGoal): value is NutritionGoal {
  return value === 'lose' || value === 'maintain' || value === 'gain'
}
