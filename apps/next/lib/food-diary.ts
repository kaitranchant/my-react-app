import type { FoodDiaryEntryFormValues } from '@/lib/validations/nutrition'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionProfile,
  MealPlanMealFood,
  MealPlanMealWithFoods,
  MealType,
} from 'app/types/database'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition'

export type FoodDiaryMacros = {
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
}

export type FoodDiaryDayGroup = {
  mealType: MealType
  label: string
  entries: ClientFoodDiaryEntry[]
  totals: FoodDiaryMacros
}

export const FOOD_DIARY_MEAL_ORDER: MealType[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'other',
]

export function emptyFoodDiaryMacros(): FoodDiaryMacros {
  return {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
  }
}

export function sumFoodDiaryMacros(
  entries: ClientFoodDiaryEntry[]
): FoodDiaryMacros {
  return entries.reduce(
    (totals, entry) => ({
      caloriesKcal: totals.caloriesKcal + (entry.calories_kcal ?? 0),
      proteinG: totals.proteinG + (entry.protein_g ?? 0),
      carbsG: totals.carbsG + (entry.carbs_g ?? 0),
      fatG: totals.fatG + (entry.fat_g ?? 0),
      fiberG: totals.fiberG + (entry.fiber_g ?? 0),
    }),
    emptyFoodDiaryMacros()
  )
}

export function groupFoodDiaryByMeal(
  entries: ClientFoodDiaryEntry[]
): FoodDiaryDayGroup[] {
  return FOOD_DIARY_MEAL_ORDER.map((mealType) => {
    const mealEntries = entries
      .filter((entry) => entry.meal_type === mealType)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))

    return {
      mealType,
      label: MEAL_TYPE_LABELS[mealType],
      entries: mealEntries,
      totals: sumFoodDiaryMacros(mealEntries),
    }
  }).filter((group) => group.entries.length > 0)
}

export type MacroAdherenceStatus = 'hit' | 'close' | 'miss' | 'unknown'

export type MacroAdherenceItem = {
  label: string
  consumed: number | null
  target: number | null
  status: MacroAdherenceStatus
}

export function getMacroAdherenceStatus(
  consumed: number | null,
  target: number | null
): MacroAdherenceStatus {
  if (consumed == null || target == null || target <= 0) return 'unknown'
  const ratio = consumed / target
  if (ratio >= 0.9 && ratio <= 1.1) return 'hit'
  if (ratio >= 0.75 && ratio <= 1.25) return 'close'
  return 'miss'
}

export function buildMacroAdherenceItems(
  consumed: FoodDiaryMacros,
  profile: ClientNutritionProfile | null,
  waterMl?: number | null,
  fiberG?: number | null
): MacroAdherenceItem[] {
  if (!profile) return []

  const effectiveFiber = fiberG ?? consumed.fiberG

  return [
    {
      label: 'Calories',
      consumed: consumed.caloriesKcal > 0 ? consumed.caloriesKcal : null,
      target: profile.calories_kcal,
      status: getMacroAdherenceStatus(
        consumed.caloriesKcal > 0 ? consumed.caloriesKcal : null,
        profile.calories_kcal
      ),
    },
    {
      label: 'Protein',
      consumed: consumed.proteinG > 0 ? consumed.proteinG : null,
      target: profile.protein_g,
      status: getMacroAdherenceStatus(
        consumed.proteinG > 0 ? consumed.proteinG : null,
        profile.protein_g
      ),
    },
    {
      label: 'Carbs',
      consumed: consumed.carbsG > 0 ? consumed.carbsG : null,
      target: profile.carbs_g,
      status: getMacroAdherenceStatus(
        consumed.carbsG > 0 ? consumed.carbsG : null,
        profile.carbs_g
      ),
    },
    {
      label: 'Fat',
      consumed: consumed.fatG > 0 ? consumed.fatG : null,
      target: profile.fat_g,
      status: getMacroAdherenceStatus(
        consumed.fatG > 0 ? consumed.fatG : null,
        profile.fat_g
      ),
    },
    {
      label: 'Fiber',
      consumed: effectiveFiber > 0 ? effectiveFiber : null,
      target: profile.fiber_g,
      status: getMacroAdherenceStatus(
        effectiveFiber > 0 ? effectiveFiber : null,
        profile.fiber_g
      ),
    },
    {
      label: 'Water',
      consumed: waterMl ?? null,
      target: profile.water_ml,
      status: getMacroAdherenceStatus(waterMl ?? null, profile.water_ml),
    },
  ].filter((item) => item.target != null)
}

export function mealPlanFoodToDiaryEntry(
  logDate: string,
  mealType: MealType,
  food: MealPlanMealFood
): FoodDiaryEntryFormValues {
  return {
    logDate,
    mealType,
    foodName: food.food_name,
    source: food.source,
    externalId: food.external_id,
    quantityG: food.quantity_g,
    caloriesKcal: food.calories_kcal,
    proteinG: food.protein_g,
    carbsG: food.carbs_g,
    fatG: food.fat_g,
    fiberG: null,
  }
}

export function mealPlanMealToDiaryEntries(
  logDate: string,
  meal: MealPlanMealWithFoods
): FoodDiaryEntryFormValues[] {
  if (meal.foods.length > 0) {
    return meal.foods.map((food) => mealPlanFoodToDiaryEntry(logDate, meal.meal_type, food))
  }

  return [
    {
      logDate,
      mealType: meal.meal_type,
      foodName: meal.name,
      source: 'custom',
      externalId: null,
      quantityG: null,
      caloriesKcal: meal.calories_kcal,
      proteinG: meal.protein_g,
      carbsG: meal.carbs_g,
      fatG: meal.fat_g,
      fiberG: null,
    },
  ]
}

export function formatFoodDiaryEntryMacros(entry: ClientFoodDiaryEntry): string | null {
  const parts: string[] = []
  if (entry.calories_kcal != null) parts.push(`${entry.calories_kcal} kcal`)
  if (entry.protein_g != null) parts.push(`${entry.protein_g}g P`)
  if (entry.carbs_g != null) parts.push(`${entry.carbs_g}g C`)
  if (entry.fat_g != null) parts.push(`${entry.fat_g}g F`)
  if (entry.fiber_g != null) parts.push(`${entry.fiber_g}g fiber`)
  return parts.length > 0 ? parts.join(' · ') : null
}
