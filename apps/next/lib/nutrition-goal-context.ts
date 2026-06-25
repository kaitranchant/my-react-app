import type {
  ClientGoal,
  ClientInbodyScan,
  ClientNutritionProfile,
} from 'app/types/database'
import { formatCompositionGoalLabel } from '@/lib/goal-progress'
import type { NutritionGoal } from '@/lib/tdee-calculator'

export type NutritionGoalContext = {
  headline: string
  detail: string | null
  suggestedCalorieAdjustment: number | null
  suggestedTdeeGoal: NutritionGoal
}

export function compositionGoalDirectionToTdeeGoal(
  direction: ClientGoal['direction'] | null | undefined
): NutritionGoal {
  if (direction === 'increase') return 'gain'
  if (direction === 'decrease') return 'lose'
  return 'maintain'
}

export function buildNutritionGoalContext(
  goals: ClientGoal[],
  latestScan: ClientInbodyScan | null
): NutritionGoalContext | null {
  const compositionGoals = goals.filter(
    (goal) => goal.category === 'composition' && goal.target_amount != null
  )

  if (compositionGoals.length === 0) {
    return null
  }

  const primary = compositionGoals[0]!
  const label = formatCompositionGoalLabel(primary)
  const direction = primary.direction
  const bodyFat = latestScan?.percent_body_fat

  let headline: string
  let suggestedCalorieAdjustment: number | null = null
  const suggestedTdeeGoal = compositionGoalDirectionToTdeeGoal(direction)

  if (direction === 'increase') {
    headline = `Client is in a building phase — suggested calorie surplus of 250–300 kcal.`
    suggestedCalorieAdjustment = 275
  } else if (direction === 'decrease') {
    headline = `Client is in a cutting phase — suggested calorie deficit of 300–500 kcal.`
    suggestedCalorieAdjustment = -400
  } else {
    headline = `Active goal: ${label}`
  }

  const details: string[] = []
  if (bodyFat != null) {
    details.push(`Currently at ${bodyFat.toFixed(1)}% body fat`)
  }
  details.push(label)

  return {
    headline,
    detail: details.join(' · '),
    suggestedCalorieAdjustment,
    suggestedTdeeGoal,
  }
}

export function hasDietaryInfo(
  profile: ClientNutritionProfile | null | undefined
): boolean {
  if (!profile) return false
  return (
    Boolean(profile.dietary_restrictions?.trim()) ||
    (Array.isArray(profile.supplements) && profile.supplements.length > 0)
  )
}
