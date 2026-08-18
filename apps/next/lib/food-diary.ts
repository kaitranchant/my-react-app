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

function positiveOrNull(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null
}

export function formatMacroAdherenceLabel(item: MacroAdherenceItem): string {
  if (item.consumed != null && item.target != null) {
    return `${item.label} ${Math.round(item.consumed)}/${Math.round(item.target)}`
  }
  if (item.consumed != null) {
    return `${item.label} ${Math.round(item.consumed)}`
  }
  return item.label
}

export function buildMacroAdherenceItems(
  consumed: FoodDiaryMacros,
  profile: ClientNutritionProfile | null,
  waterMl?: number | null,
  fiberG?: number | null
): MacroAdherenceItem[] {
  const caloriesConsumed = positiveOrNull(consumed.caloriesKcal)
  const proteinConsumed = positiveOrNull(consumed.proteinG)
  const carbsConsumed = positiveOrNull(consumed.carbsG)
  const fatConsumed = positiveOrNull(consumed.fatG)
  const fiberConsumed = positiveOrNull(fiberG ?? consumed.fiberG)
  const waterConsumed = positiveOrNull(waterMl)

  return [
    {
      label: 'Calories',
      consumed: caloriesConsumed,
      target: profile?.calories_kcal ?? null,
      status: getMacroAdherenceStatus(
        caloriesConsumed,
        profile?.calories_kcal ?? null
      ),
    },
    {
      label: 'Protein',
      consumed: proteinConsumed,
      target: profile?.protein_g ?? null,
      status: getMacroAdherenceStatus(proteinConsumed, profile?.protein_g ?? null),
    },
    {
      label: 'Carbs',
      consumed: carbsConsumed,
      target: profile?.carbs_g ?? null,
      status: getMacroAdherenceStatus(carbsConsumed, profile?.carbs_g ?? null),
    },
    {
      label: 'Fat',
      consumed: fatConsumed,
      target: profile?.fat_g ?? null,
      status: getMacroAdherenceStatus(fatConsumed, profile?.fat_g ?? null),
    },
    {
      label: 'Fiber',
      consumed: fiberConsumed,
      target: profile?.fiber_g ?? null,
      status: getMacroAdherenceStatus(fiberConsumed, profile?.fiber_g ?? null),
    },
    {
      label: 'Water',
      consumed: waterConsumed,
      target: profile?.water_ml ?? null,
      status: getMacroAdherenceStatus(waterConsumed, profile?.water_ml ?? null),
    },
  ].filter((item) => item.consumed != null || item.target != null)
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
  meal: MealPlanMealWithFoods,
  mealType: MealType = meal.meal_type
): FoodDiaryEntryFormValues[] {
  if (meal.foods.length > 0) {
    return meal.foods.map((food) => mealPlanFoodToDiaryEntry(logDate, mealType, food))
  }

  return [
    {
      logDate,
      mealType,
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
