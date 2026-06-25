export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active'

export type NutritionGoal = 'lose' | 'maintain' | 'gain'

export type TdeeInputs = {
  weightLbs: number
  heightIn: number
  age: number
  sex: 'male' | 'female'
  activityLevel: ActivityLevel
  goal: NutritionGoal
}

export type TdeeResult = {
  bmr: number
  tdee: number
  targetCalories: number
  calorieAdjustment: number
  suggestedProteinG: number
  suggestedCarbsG: number
  suggestedFatG: number
  proteinPercent: number
  carbsPercent: number
  fatPercent: number
}

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Lightly active (1–3 days/week)',
  moderate: 'Moderately active (3–5 days/week)',
  active: 'Very active (6–7 days/week)',
  very_active: 'Extra active (physical job + training)',
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const NUTRITION_GOAL_LABELS: Record<NutritionGoal, string> = {
  lose: 'Fat loss',
  maintain: 'Maintenance',
  gain: 'Muscle gain / bulk',
}

const GOAL_CALORIE_ADJUSTMENTS: Record<NutritionGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 275,
}

/** Mifflin-St Jeor BMR formula (weight in kg, height in cm). */
export function calculateBmr(
  weightLbs: number,
  heightIn: number,
  age: number,
  sex: 'male' | 'female'
): number {
  const weightKg = weightLbs * 0.453592
  const heightCm = heightIn * 2.54
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function calculateTdee(inputs: TdeeInputs): TdeeResult {
  const bmr = calculateBmr(
    inputs.weightLbs,
    inputs.heightIn,
    inputs.age,
    inputs.sex
  )
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[inputs.activityLevel])
  const calorieAdjustment = GOAL_CALORIE_ADJUSTMENTS[inputs.goal]
  const targetCalories = Math.max(1200, tdee + calorieAdjustment)

  const proteinG = Math.round(inputs.weightLbs * 0.8)
  const fatG = Math.round((targetCalories * 0.25) / 9)
  const proteinCalories = proteinG * 4
  const fatCalories = fatG * 9
  const carbsG = Math.max(
    0,
    Math.round((targetCalories - proteinCalories - fatCalories) / 4)
  )

  const totalMacroCalories = proteinG * 4 + carbsG * 4 + fatG * 9
  const proteinPercent =
    totalMacroCalories > 0
      ? Math.round(((proteinG * 4) / totalMacroCalories) * 100)
      : 0
  const carbsPercent =
    totalMacroCalories > 0
      ? Math.round(((carbsG * 4) / totalMacroCalories) * 100)
      : 0
  const fatPercent =
    totalMacroCalories > 0
      ? Math.round(((fatG * 9) / totalMacroCalories) * 100)
      : 0

  return {
    bmr,
    tdee,
    targetCalories,
    calorieAdjustment,
    suggestedProteinG: proteinG,
    suggestedCarbsG: carbsG,
    suggestedFatG: fatG,
    proteinPercent,
    carbsPercent,
    fatPercent,
  }
}

export function formatMacroWithPercent(
  grams: number,
  percent: number,
  label: string
): string {
  return `${grams}g ${label} (${percent}% of calories)`
}
