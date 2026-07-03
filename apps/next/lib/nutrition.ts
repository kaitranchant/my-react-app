import { toDateKey } from '@/lib/calendar'
import { CHECK_IN_SCALES } from '@/lib/check-ins'
import type {
  NutritionLogFormValues,
  NutritionProfileFormValues,
  NutritionSetupFormInputValues,
  NutritionSetupFormValues,
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
  BiologicalSex,
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

export function preserveNutritionIntakeFields(
  profile: ClientNutritionProfile | null
): Pick<
  ClientNutritionProfileInsert,
  | 'client_nutrition_notes'
  | 'favorite_foods'
  | 'current_calories_kcal'
  | 'current_protein_g'
  | 'current_carbs_g'
  | 'current_fat_g'
  | 'setup_goal'
  | 'body_weight_lbs'
  | 'height_in'
  | 'age_years'
  | 'setup_biological_sex'
  | 'activity_level'
  | 'meal_frequency'
  | 'cooking_time_skill'
  | 'budget_constraints'
  | 'food_dislikes'
  | 'grocery_access'
  | 'setup_form_requested_at'
  | 'setup_form_completed_at'
> {
  return {
    client_nutrition_notes: profile?.client_nutrition_notes ?? null,
    favorite_foods: profile?.favorite_foods ?? null,
    current_calories_kcal: profile?.current_calories_kcal ?? null,
    current_protein_g: profile?.current_protein_g ?? null,
    current_carbs_g: profile?.current_carbs_g ?? null,
    current_fat_g: profile?.current_fat_g ?? null,
    setup_goal: profile?.setup_goal ?? null,
    body_weight_lbs: profile?.body_weight_lbs ?? null,
    height_in: profile?.height_in ?? null,
    age_years: profile?.age_years ?? null,
    setup_biological_sex: profile?.setup_biological_sex ?? null,
    activity_level: profile?.activity_level ?? null,
    meal_frequency: profile?.meal_frequency ?? null,
    cooking_time_skill: profile?.cooking_time_skill ?? null,
    budget_constraints: profile?.budget_constraints ?? null,
    food_dislikes: profile?.food_dislikes ?? null,
    grocery_access: profile?.grocery_access ?? null,
    setup_form_requested_at: profile?.setup_form_requested_at ?? null,
    setup_form_completed_at: profile?.setup_form_completed_at ?? null,
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

export function nutritionSetupFormToFormValues(
  profile: ClientNutritionProfile | null,
  options?: { defaultBiologicalSex?: BiologicalSex | null }
): NutritionSetupFormInputValues {
  if (!profile) {
    return {
      setupGoal: null,
      bodyWeightLbs: null,
      heightIn: null,
      ageYears: null,
      setupBiologicalSex: options?.defaultBiologicalSex ?? null,
      activityLevel: null,
      mealFrequency: null,
      cookingTimeSkill: null,
      budgetConstraints: null,
      foodDislikes: null,
      groceryAccess: null,
      favoriteFoods: null,
      currentCaloriesKcal: null,
      currentProteinG: null,
      currentCarbsG: null,
      currentFatG: null,
      dietaryRestrictions: null,
      supplements: [],
      additionalNotes: null,
    }
  }

  return {
    setupGoal: profile.setup_goal,
    bodyWeightLbs: profile.body_weight_lbs,
    heightIn: profile.height_in,
    ageYears: profile.age_years,
    setupBiologicalSex:
      profile.setup_biological_sex ?? options?.defaultBiologicalSex ?? null,
    activityLevel: profile.activity_level,
    mealFrequency: profile.meal_frequency,
    cookingTimeSkill: profile.cooking_time_skill,
    budgetConstraints: profile.budget_constraints,
    foodDislikes: profile.food_dislikes,
    groceryAccess: profile.grocery_access,
    favoriteFoods: profile.favorite_foods,
    currentCaloriesKcal: profile.current_calories_kcal,
    currentProteinG: profile.current_protein_g,
    currentCarbsG: profile.current_carbs_g,
    currentFatG: profile.current_fat_g,
    dietaryRestrictions: profile.dietary_restrictions,
    supplements: normalizeSupplements(parseSupplements(profile.supplements)),
    additionalNotes: profile.client_nutrition_notes,
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

export function sumMacroPercentTotal(
  percents: ReturnType<typeof computeMacroPercents>
): number | null {
  if (
    percents.protein == null &&
    percents.carbs == null &&
    percents.fat == null
  ) {
    return null
  }

  return (percents.protein ?? 0) + (percents.carbs ?? 0) + (percents.fat ?? 0)
}

export function isMacroSplitBalanced(total: number): boolean {
  return total >= 99 && total <= 101
}

export type MacroNutrient = 'protein' | 'carbs' | 'fat'

const CALORIES_PER_MACRO_GRAM: Record<MacroNutrient, number> = {
  protein: 4,
  carbs: 4,
  fat: 9,
}

export function gramsFromMacroPercent(
  caloriesKcal: number,
  percent: number,
  macro: MacroNutrient
): number {
  const caloriesForMacro = (caloriesKcal * percent) / 100
  return Math.round(caloriesForMacro / CALORIES_PER_MACRO_GRAM[macro])
}

export function macroPercentFromGrams(
  caloriesKcal: number,
  grams: number,
  macro: MacroNutrient
): number {
  return Math.round(
    ((grams * CALORIES_PER_MACRO_GRAM[macro]) / caloriesKcal) * 100
  )
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

export function sortMealPlanDays(
  days: MealPlanDayWithMeals[]
): MealPlanDayWithMeals[] {
  return [...days].sort((left, right) => left.day_offset - right.day_offset)
}

export function getMealPlanDayIndexForOffset(
  sortedDays: MealPlanDayWithMeals[],
  dayOffset: number
): number {
  const index = sortedDays.findIndex((day) => day.day_offset === dayOffset)
  return index >= 0 ? index : 0
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

export function sortMealsByOrder<T extends MealPlanMeal>(meals: T[]): T[] {
  return [...meals].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order
    }
    return left.name.localeCompare(right.name)
  })
}

export type MealPlanMealInPlanOrder = MealPlanMealWithFoods & {
  dayOffset: number
  dayLabel: string
}

export function flattenMealPlanMealsInOrder(
  days: MealPlanDayWithMeals[]
): MealPlanMealInPlanOrder[] {
  const flattened: MealPlanMealInPlanOrder[] = []

  for (const day of sortMealPlanDays(days)) {
    const dayLabel = formatMealPlanDayLabel(day)
    for (const meal of sortMealsByOrder(day.meals)) {
      flattened.push({
        ...meal,
        dayOffset: day.day_offset,
        dayLabel,
      })
    }
  }

  return flattened
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
