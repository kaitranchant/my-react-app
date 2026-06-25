import { toDateKey } from '@/lib/calendar'
import { CHECK_IN_SCALES } from '@/lib/check-ins'
import type {
  NutritionLogFormValues,
  NutritionProfileFormValues,
} from '@/lib/validations/nutrition'
import type {
  ClientFoodDiaryEntry,
  ClientFoodDiaryEntryInsert,
  ClientNutritionLog,
  ClientNutritionLogInsert,
  ClientNutritionProfile,
  ClientNutritionProfileInsert,
  MealPlanAssignment,
  MealPlanDay,
  MealPlanDayWithMeals,
  MealPlanMeal,
  MealPlanMealFood,
  MealPlanMealWithFoods,
  MealType,
  NutritionSupplement,
} from 'app/types/database'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  other: 'Other',
}

export function createEmptyNutritionLogValues(
  logDate = toDateKey(new Date())
): NutritionLogFormValues {
  return {
    logDate,
    adherenceScore: 3,
    clientNotes: null,
    fiberG: null,
    waterMl: null,
  }
}

export function nutritionLogValuesToRow(
  values: NutritionLogFormValues,
  clientId: string,
  coachId: string
): ClientNutritionLogInsert {
  return {
    client_id: clientId,
    coach_id: coachId,
    log_date: values.logDate,
    adherence_score: values.adherenceScore,
    client_notes: values.clientNotes,
    fiber_g: values.fiberG,
    water_ml: values.waterMl,
  }
}

export function nutritionLogToFormValues(
  log: ClientNutritionLog
): NutritionLogFormValues {
  return {
    logDate: log.log_date,
    adherenceScore: log.adherence_score,
    clientNotes: log.client_notes,
    fiberG: log.fiber_g,
    waterMl: log.water_ml,
  }
}

export function nutritionProfileValuesToRow(
  values: NutritionProfileFormValues,
  clientId: string,
  coachId: string
): ClientNutritionProfileInsert {
  return {
    client_id: clientId,
    coach_id: coachId,
    calories_kcal: values.caloriesKcal,
    protein_g: values.proteinG,
    carbs_g: values.carbsG,
    fat_g: values.fatG,
    fiber_g: values.fiberG,
    water_ml: values.waterMl,
    notes: values.notes,
    dietary_restrictions: values.dietaryRestrictions,
    supplements: normalizeSupplements(values.supplements),
  }
}

export function nutritionProfileToFormValues(
  profile: ClientNutritionProfile | null
): NutritionProfileFormValues {
  if (!profile) {
    return {
      caloriesKcal: null,
      proteinG: null,
      carbsG: null,
      fatG: null,
      fiberG: null,
      waterMl: null,
      notes: null,
      dietaryRestrictions: null,
      supplements: [],
    }
  }

  return {
    caloriesKcal: profile.calories_kcal,
    proteinG: profile.protein_g,
    carbsG: profile.carbs_g,
    fatG: profile.fat_g,
    fiberG: profile.fiber_g,
    waterMl: profile.water_ml,
    notes: profile.notes,
    dietaryRestrictions: profile.dietary_restrictions,
    supplements: normalizeSupplements(parseSupplements(profile.supplements)),
  }
}

export function normalizeSupplements(
  supplements: Array<{
    name: string
    dosage?: string | null
    timing?: string | null
  }>
): NutritionSupplement[] {
  return supplements.map((s) => ({
    name: s.name.trim(),
    dosage: s.dosage ?? null,
    timing: s.timing ?? null,
  }))
}

export function parseSupplements(
  value: NutritionSupplement[] | unknown
): NutritionSupplement[] {
  if (!Array.isArray(value)) return []
  return normalizeSupplements(
    value.filter(
      (item): item is NutritionSupplement =>
        item != null &&
        typeof item === 'object' &&
        'name' in item &&
        typeof (item as NutritionSupplement).name === 'string'
    )
  )
}

export function formatAdherenceScore(score: number): string {
  const label = CHECK_IN_SCALES.nutrition.labels[score - 1]
  return label ? `${score}/5 — ${label}` : `${score}/5`
}

export function formatMacroValue(
  value: number | null | undefined,
  unit: string
): string | null {
  if (value == null) return null
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return `${formatted} ${unit}`
}

export function hasNutritionTargets(
  profile: ClientNutritionProfile | null | undefined
): boolean {
  if (!profile) return false
  return (
    profile.calories_kcal != null ||
    profile.protein_g != null ||
    profile.carbs_g != null ||
    profile.fat_g != null ||
    profile.fiber_g != null ||
    profile.water_ml != null
  )
}

export function computeMacroPercents(profile: ClientNutritionProfile | null) {
  if (!profile?.calories_kcal) {
    return { protein: null, carbs: null, fat: null }
  }
  const total = profile.calories_kcal
  const protein =
    profile.protein_g != null
      ? Math.round(((profile.protein_g * 4) / total) * 100)
      : null
  const carbs =
    profile.carbs_g != null
      ? Math.round(((profile.carbs_g * 4) / total) * 100)
      : null
  const fat =
    profile.fat_g != null
      ? Math.round(((profile.fat_g * 9) / total) * 100)
      : null
  return { protein, carbs, fat }
}

export function daysBetweenDateKeys(startDateKey: string, endDateKey: string) {
  const start = new Date(`${startDateKey}T12:00:00`)
  const end = new Date(`${endDateKey}T12:00:00`)
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

export function getMealPlanDayOffset(
  assignment: Pick<MealPlanAssignment, 'start_date'>,
  todayKey = toDateKey(new Date())
): number {
  return Math.max(0, daysBetweenDateKeys(assignment.start_date, todayKey))
}

export function formatMealPlanDayLabel(
  day: Pick<MealPlanDay, 'day_offset' | 'label'>
): string {
  const custom = day.label?.trim()
  if (custom) return custom
  return `Day ${day.day_offset + 1}`
}

export type TodayMealPlanResult = {
  dayOffset: number
  day: MealPlanDayWithMeals | null
  planComplete: boolean
  planDayLabel: string | null
}

export function getTodayMealPlanDay(
  assignment: MealPlanAssignment | null,
  days: MealPlanDayWithMeals[],
  todayKey = toDateKey(new Date())
): TodayMealPlanResult {
  if (!assignment || days.length === 0) {
    return {
      dayOffset: 0,
      day: null,
      planComplete: false,
      planDayLabel: null,
    }
  }

  const sortedDays = [...days].sort((left, right) => left.day_offset - right.day_offset)
  const maxOffset = sortedDays[sortedDays.length - 1]!.day_offset
  const dayOffset = getMealPlanDayOffset(assignment, todayKey)

  if (dayOffset > maxOffset) {
    const lastDay = sortedDays[sortedDays.length - 1]!
    return {
      dayOffset,
      day: null,
      planComplete: true,
      planDayLabel: `${formatMealPlanDayLabel(lastDay)} complete`,
    }
  }

  const day = sortedDays.find((entry) => entry.day_offset === dayOffset) ?? null
  const defaultLabel = `Day ${dayOffset + 1}`

  return {
    dayOffset,
    day,
    planComplete: false,
    planDayLabel: day
      ? formatMealPlanDayLabel(day)
      : `${defaultLabel} (no meals planned)`,
  }
}

export function sortMealsByOrder(meals: MealPlanMeal[]): MealPlanMeal[] {
  return [...meals].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }
    return left.name.localeCompare(right.name)
  })
}

export function groupDaysWithMeals(
  days: MealPlanDay[],
  meals: MealPlanMeal[],
  mealFoods: MealPlanMealFood[] = []
): MealPlanDayWithMeals[] {
  const foodsByMealId = new Map<string, MealPlanMealFood[]>()

  for (const food of mealFoods) {
    const bucket = foodsByMealId.get(food.meal_plan_meal_id) ?? []
    bucket.push(food)
    foodsByMealId.set(food.meal_plan_meal_id, bucket)
  }

  return [...days]
    .sort((left, right) => left.day_offset - right.day_offset)
    .map((day) => ({
      ...day,
      meals: sortMealsByOrder(
        meals.filter((meal) => meal.meal_plan_day_id === day.id)
      ).map((meal) => ({
        ...meal,
        foods: sortMealFoodsByOrder(foodsByMealId.get(meal.id) ?? []),
      })),
    }))
}

function sortMealFoodsByOrder(foods: MealPlanMealFood[]) {
  return [...foods].sort((left, right) => left.sort_order - right.sort_order)
}

export function formatMealMacros(meal: MealPlanMeal | MealPlanMealWithFoods): string | null {
  const parts = [
    formatMacroValue(meal.calories_kcal, 'kcal'),
    formatMacroValue(meal.protein_g, 'g protein'),
    formatMacroValue(meal.carbs_g, 'g carbs'),
    formatMacroValue(meal.fat_g, 'g fat'),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : null
}
