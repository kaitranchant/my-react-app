import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeMacroPercents,
  flattenMealPlanMealsInOrder,
  formatAdherenceScore,
  formatMealPlanDayLabel,
  getMealPlanDayIndexForOffset,
  gramsFromMacroPercent,
  groupDaysWithMeals,
  isMacroSplitBalanced,
  macroPercentFromGrams,
  sortMealPlanDays,
  sumMacroPercentTotal,
} from './nutrition'
import type {
  MealPlanDay,
  MealPlanMeal,
} from 'app/types/database'

test('formatMealPlanDayLabel uses custom label or falls back to Day N', () => {
  assert.equal(
    formatMealPlanDayLabel({ day_offset: 0, label: 'Monday' }),
    'Monday'
  )
  assert.equal(formatMealPlanDayLabel({ day_offset: 2, label: null }), 'Day 3')
})

test('sortMealPlanDays and getMealPlanDayIndexForOffset support day browsing', () => {
  const days = groupDaysWithMeals(
    [
      {
        id: 'day-2',
        meal_plan_id: 'plan-1',
        day_offset: 2,
        label: null,
        notes: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'day-0',
        meal_plan_id: 'plan-1',
        day_offset: 0,
        label: 'Day one',
        notes: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ] satisfies MealPlanDay[],
    []
  )

  const sorted = sortMealPlanDays(days)
  assert.equal(sorted[0]?.id, 'day-0')
  assert.equal(sorted[1]?.id, 'day-2')
  assert.equal(getMealPlanDayIndexForOffset(sorted, 2), 1)
  assert.equal(getMealPlanDayIndexForOffset(sorted, 99), 0)
})

test('flattenMealPlanMealsInOrder returns meals across days in plan order', () => {
  const days = groupDaysWithMeals(
    [
      {
        id: 'day-1',
        meal_plan_id: 'plan-1',
        day_offset: 1,
        label: 'Day two',
        notes: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'day-0',
        meal_plan_id: 'plan-1',
        day_offset: 0,
        label: 'Day one',
        notes: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ] satisfies MealPlanDay[],
    [
      {
        id: 'meal-b',
        meal_plan_day_id: 'day-0',
        sort_order: 1,
        meal_type: 'lunch',
        name: 'Lunch',
        description: null,
        calories_kcal: 500,
        protein_g: 30,
        carbs_g: 40,
        fat_g: 20,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'meal-a',
        meal_plan_day_id: 'day-0',
        sort_order: 0,
        meal_type: 'breakfast',
        name: 'Breakfast',
        description: null,
        calories_kcal: 400,
        protein_g: 20,
        carbs_g: 50,
        fat_g: 10,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'meal-c',
        meal_plan_day_id: 'day-1',
        sort_order: 0,
        meal_type: 'dinner',
        name: 'Dinner',
        description: null,
        calories_kcal: 600,
        protein_g: 40,
        carbs_g: 30,
        fat_g: 25,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ] satisfies MealPlanMeal[]
  )

  const flattened = flattenMealPlanMealsInOrder(days)

  assert.deepEqual(
    flattened.map((meal) => meal.id),
    ['meal-a', 'meal-b', 'meal-c']
  )
  assert.equal(flattened[0]?.dayLabel, 'Day one')
  assert.equal(flattened[2]?.dayLabel, 'Day two')
})

test('formatAdherenceScore includes label text from check-in scale', () => {
  assert.match(formatAdherenceScore(5), /5\/5/)
  assert.match(formatAdherenceScore(1), /Off plan/)
})

test('sumMacroPercentTotal adds protein, carbs, and fat percentages', () => {
  const percents = computeMacroPercents({
    calories_kcal: 2975,
    protein_g: 145,
    carbs_g: 413,
    fat_g: 83,
  } as never)

  assert.equal(sumMacroPercentTotal(percents), 100)
  assert.equal(isMacroSplitBalanced(sumMacroPercentTotal(percents)!), true)
})

test('gramsFromMacroPercent and macroPercentFromGrams convert macro splits', () => {
  const calories = 2975
  const proteinPercent = 19
  const proteinG = gramsFromMacroPercent(calories, proteinPercent, 'protein')

  assert.equal(proteinG, 141)
  assert.equal(macroPercentFromGrams(calories, proteinG, 'protein'), proteinPercent)
})
