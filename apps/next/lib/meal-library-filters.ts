import type { MealType } from 'app/types/database'

export type MealLibraryNumericRange = {
  key: string
  label: string
  min: number | null
  max: number | null
}

export const MEAL_LIBRARY_CALORIE_RANGES = [
  { key: 'under_300', label: 'Under 300', min: null, max: 300 },
  { key: '300_400', label: '300–400', min: 300, max: 400 },
  { key: '400_500', label: '400–500', min: 400, max: 500 },
  { key: '500_600', label: '500–600', min: 500, max: 600 },
  { key: '600_plus', label: '600+', min: 600, max: null },
] as const satisfies readonly MealLibraryNumericRange[]

export const MEAL_LIBRARY_PROTEIN_RANGES = [
  { key: 'under_20', label: 'Under 20g', min: null, max: 20 },
  { key: '20_30', label: '20–30g', min: 20, max: 30 },
  { key: '30_40', label: '30–40g', min: 30, max: 40 },
  { key: '40_50', label: '40–50g', min: 40, max: 50 },
  { key: '50_plus', label: '50g+', min: 50, max: null },
] as const satisfies readonly MealLibraryNumericRange[]

export const MEAL_LIBRARY_CARBS_RANGES = [
  { key: 'under_20', label: 'Under 20g', min: null, max: 20 },
  { key: '20_40', label: '20–40g', min: 20, max: 40 },
  { key: '40_60', label: '40–60g', min: 40, max: 60 },
  { key: '60_80', label: '60–80g', min: 60, max: 80 },
  { key: '80_plus', label: '80g+', min: 80, max: null },
] as const satisfies readonly MealLibraryNumericRange[]

export const MEAL_LIBRARY_FAT_RANGES = [
  { key: 'under_10', label: 'Under 10g', min: null, max: 10 },
  { key: '10_20', label: '10–20g', min: 10, max: 20 },
  { key: '20_30', label: '20–30g', min: 20, max: 30 },
  { key: '30_40', label: '30–40g', min: 30, max: 40 },
  { key: '40_plus', label: '40g+', min: 40, max: null },
] as const satisfies readonly MealLibraryNumericRange[]

export type MealLibraryCalorieRangeKey =
  (typeof MEAL_LIBRARY_CALORIE_RANGES)[number]['key']

export type MealLibraryProteinRangeKey =
  (typeof MEAL_LIBRARY_PROTEIN_RANGES)[number]['key']

export type MealLibraryCarbsRangeKey =
  (typeof MEAL_LIBRARY_CARBS_RANGES)[number]['key']

export type MealLibraryFatRangeKey = (typeof MEAL_LIBRARY_FAT_RANGES)[number]['key']

function parseRangeKey<T extends string>(
  value: string | null | undefined,
  keys: readonly T[]
): T | null {
  if (!value) return null
  return keys.includes(value as T) ? (value as T) : null
}

function getRangeLabel<T extends string>(
  ranges: readonly MealLibraryNumericRange[],
  key: T
): string {
  return ranges.find((range) => range.key === key)?.label ?? key
}

export function mealMatchesNumericRange(
  value: number | null,
  ranges: readonly MealLibraryNumericRange[],
  rangeKey: string
): boolean {
  if (value == null) return false

  const range = ranges.find((item) => item.key === rangeKey)
  if (!range) return false

  if (range.min != null && value < range.min) return false
  if (range.max != null && value >= range.max) return false
  return true
}

function applyNumericRangeFilter<
  T extends Record<string, number | null>,
  K extends string,
>(
  meals: T[],
  field: keyof T & string,
  ranges: readonly MealLibraryNumericRange[],
  rangeKey: K | null | undefined
): T[] {
  if (!rangeKey) return meals
  return meals.filter((meal) =>
    mealMatchesNumericRange(meal[field] as number | null, ranges, rangeKey)
  )
}

export function parseMealLibraryCalorieRange(
  value: string | null | undefined
): MealLibraryCalorieRangeKey | null {
  return parseRangeKey(
    value,
    MEAL_LIBRARY_CALORIE_RANGES.map((range) => range.key)
  )
}

export function parseMealLibraryProteinRange(
  value: string | null | undefined
): MealLibraryProteinRangeKey | null {
  return parseRangeKey(
    value,
    MEAL_LIBRARY_PROTEIN_RANGES.map((range) => range.key)
  )
}

export function parseMealLibraryCarbsRange(
  value: string | null | undefined
): MealLibraryCarbsRangeKey | null {
  return parseRangeKey(
    value,
    MEAL_LIBRARY_CARBS_RANGES.map((range) => range.key)
  )
}

export function parseMealLibraryFatRange(
  value: string | null | undefined
): MealLibraryFatRangeKey | null {
  return parseRangeKey(
    value,
    MEAL_LIBRARY_FAT_RANGES.map((range) => range.key)
  )
}

export function getMealLibraryCalorieRangeLabel(
  key: MealLibraryCalorieRangeKey
): string {
  return getRangeLabel(MEAL_LIBRARY_CALORIE_RANGES, key)
}

export function getMealLibraryProteinRangeLabel(
  key: MealLibraryProteinRangeKey
): string {
  return getRangeLabel(MEAL_LIBRARY_PROTEIN_RANGES, key)
}

export function getMealLibraryCarbsRangeLabel(key: MealLibraryCarbsRangeKey): string {
  return getRangeLabel(MEAL_LIBRARY_CARBS_RANGES, key)
}

export function getMealLibraryFatRangeLabel(key: MealLibraryFatRangeKey): string {
  return getRangeLabel(MEAL_LIBRARY_FAT_RANGES, key)
}

export function mealMatchesCalorieRange(
  caloriesKcal: number | null,
  rangeKey: MealLibraryCalorieRangeKey
): boolean {
  return mealMatchesNumericRange(
    caloriesKcal,
    MEAL_LIBRARY_CALORIE_RANGES,
    rangeKey
  )
}

export function mealMatchesProteinRange(
  proteinG: number | null,
  rangeKey: MealLibraryProteinRangeKey
): boolean {
  return mealMatchesNumericRange(proteinG, MEAL_LIBRARY_PROTEIN_RANGES, rangeKey)
}

export function mealMatchesCarbsRange(
  carbsG: number | null,
  rangeKey: MealLibraryCarbsRangeKey
): boolean {
  return mealMatchesNumericRange(carbsG, MEAL_LIBRARY_CARBS_RANGES, rangeKey)
}

export function mealMatchesFatRange(
  fatG: number | null,
  rangeKey: MealLibraryFatRangeKey
): boolean {
  return mealMatchesNumericRange(fatG, MEAL_LIBRARY_FAT_RANGES, rangeKey)
}

export type MealLibraryListFilters = {
  status?: 'active' | 'archived'
  mealType?: MealType
  calorieRange?: MealLibraryCalorieRangeKey
  proteinRange?: MealLibraryProteinRangeKey
  carbsRange?: MealLibraryCarbsRangeKey
  fatRange?: MealLibraryFatRangeKey
  q?: string
}

export function applyMealLibraryCalorieRangeFilter<
  T extends { calories_kcal: number | null },
>(meals: T[], calorieRange: MealLibraryCalorieRangeKey | null | undefined): T[] {
  return applyNumericRangeFilter(
    meals,
    'calories_kcal',
    MEAL_LIBRARY_CALORIE_RANGES,
    calorieRange
  )
}

export function applyMealLibraryProteinRangeFilter<
  T extends { protein_g: number | null },
>(meals: T[], proteinRange: MealLibraryProteinRangeKey | null | undefined): T[] {
  return applyNumericRangeFilter(
    meals,
    'protein_g',
    MEAL_LIBRARY_PROTEIN_RANGES,
    proteinRange
  )
}

export function applyMealLibraryCarbsRangeFilter<
  T extends { carbs_g: number | null },
>(meals: T[], carbsRange: MealLibraryCarbsRangeKey | null | undefined): T[] {
  return applyNumericRangeFilter(
    meals,
    'carbs_g',
    MEAL_LIBRARY_CARBS_RANGES,
    carbsRange
  )
}

export function applyMealLibraryFatRangeFilter<
  T extends { fat_g: number | null },
>(meals: T[], fatRange: MealLibraryFatRangeKey | null | undefined): T[] {
  return applyNumericRangeFilter(meals, 'fat_g', MEAL_LIBRARY_FAT_RANGES, fatRange)
}

export function buildMealLibraryHref(params: {
  status?: 'active' | 'archived'
  mealType?: MealType
  calorieRange?: MealLibraryCalorieRangeKey
  proteinRange?: MealLibraryProteinRangeKey
  carbsRange?: MealLibraryCarbsRangeKey
  fatRange?: MealLibraryFatRangeKey
  q?: string
}) {
  const searchParams = new URLSearchParams()
  if (params.status) searchParams.set('status', params.status)
  if (params.mealType) searchParams.set('type', params.mealType)
  if (params.calorieRange) searchParams.set('calories', params.calorieRange)
  if (params.proteinRange) searchParams.set('protein', params.proteinRange)
  if (params.carbsRange) searchParams.set('carbs', params.carbsRange)
  if (params.fatRange) searchParams.set('fat', params.fatRange)
  if (params.q?.trim()) searchParams.set('q', params.q.trim())
  const query = searchParams.toString()
  return query ? `/library/meals?${query}` : '/library/meals'
}
