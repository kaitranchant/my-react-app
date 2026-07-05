import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  LibraryMeal,
  LibraryMealWithFoods,
  MealType,
} from 'app/types/database'

import {
  applyMealLibraryCalorieRangeFilter,
  applyMealLibraryCarbsRangeFilter,
  applyMealLibraryFatRangeFilter,
  applyMealLibraryProteinRangeFilter,
  type MealLibraryCalorieRangeKey,
  type MealLibraryCarbsRangeKey,
  type MealLibraryFatRangeKey,
  type MealLibraryListFilters,
  type MealLibraryProteinRangeKey,
} from './meal-library-filters'

export async function fetchLibraryMealWithFoods(
  supabase: SupabaseClient,
  coachId: string,
  mealId: string
): Promise<LibraryMealWithFoods | null> {
  const { data: meal, error: mealError } = await supabase
    .from('library_meals')
    .select('*')
    .eq('id', mealId)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (mealError || !meal) {
    return null
  }

  const { data: foods, error: foodsError } = await supabase
    .from('library_meal_foods')
    .select('*')
    .eq('library_meal_id', mealId)
    .order('sort_order', { ascending: true })

  if (foodsError) {
    return null
  }

  return {
    ...(meal as LibraryMeal),
    foods: foods ?? [],
  }
}

export async function fetchLibraryMealsList(
  supabase: SupabaseClient,
  coachId: string,
  filters: MealLibraryListFilters = {}
): Promise<LibraryMeal[]> {
  let queryBuilder = supabase
    .from('library_meals')
    .select('*')
    .eq('coach_id', coachId)
    .order('updated_at', { ascending: false })

  if (filters.status) {
    queryBuilder = queryBuilder.eq('status', filters.status)
  }

  if (filters.mealType) {
    queryBuilder = queryBuilder.eq('meal_type', filters.mealType)
  }

  if (filters.q?.trim()) {
    queryBuilder = queryBuilder.ilike('name', `%${filters.q.trim()}%`)
  }

  const { data, error } = await queryBuilder
  if (error) {
    throw new Error(error.message)
  }

  let meals = (data ?? []) as LibraryMeal[]

  if (filters.calorieRange) {
    meals = applyMealLibraryCalorieRangeFilter(meals, filters.calorieRange)
  }

  if (filters.proteinRange) {
    meals = applyMealLibraryProteinRangeFilter(meals, filters.proteinRange)
  }

  if (filters.carbsRange) {
    meals = applyMealLibraryCarbsRangeFilter(meals, filters.carbsRange)
  }

  if (filters.fatRange) {
    meals = applyMealLibraryFatRangeFilter(meals, filters.fatRange)
  }

  return meals
}

export async function fetchActiveLibraryMealsForPicker(
  supabase: SupabaseClient,
  coachId: string,
  filters: {
    mealType?: MealType
    calorieRange?: MealLibraryCalorieRangeKey
    proteinRange?: MealLibraryProteinRangeKey
    carbsRange?: MealLibraryCarbsRangeKey
    fatRange?: MealLibraryFatRangeKey
    q?: string
  } = {}
): Promise<LibraryMeal[]> {
  return fetchLibraryMealsList(supabase, coachId, {
    status: 'active',
    mealType: filters.mealType,
    calorieRange: filters.calorieRange,
    proteinRange: filters.proteinRange,
    carbsRange: filters.carbsRange,
    fatRange: filters.fatRange,
    q: filters.q,
  })
}
