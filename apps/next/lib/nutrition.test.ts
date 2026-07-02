import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeMacroPercents,
  formatAdherenceScore,
  formatMealPlanDayLabel,
  getMealPlanDayIndexForOffset,
  getMealPlanDayOffset,
  getTodayMealPlanDay,
  gramsFromMacroPercent,
  groupDaysWithMeals,
  isMacroSplitBalanced,
  macroPercentFromGrams,
  sortMealPlanDays,
  sumMacroPercentTotal,
} from './nutrition'
import type {
  MealPlanAssignment,
  MealPlanDay,
  MealPlanMeal,
} from 'app/types/database'

test('getMealPlanDayOffset returns days since start date', () => {
  assert.equal(getMealPlanDayOffset({ start_date: '2026-06-01' }, '2026-06-03'), 2)
})

test('getMealPlanDayOffset never returns negative offsets', () => {
  assert.equal(getMealPlanDayOffset({ start_date: '2026-06-10' }, '2026-06-03'), 0)
})

test('getTodayMealPlanDay returns matching day and completion state', () => {
  const assignment: MealPlanAssignment = {
    id: 'assignment-1',
    coach_id: 'coach-1',
    client_id: 'client-1',
    meal_plan_id: 'plan-1',
    status: 'active',
    start_date: '2026-06-01',
    team_id: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }

  const days = groupDaysWithMeals(
    [
      {
        id: 'day-0',
        meal_plan_id: 'plan-1',
        day_offset: 0,
        label: null,
        notes: null,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'day-1',
        meal_plan_id: 'plan-1',
        day_offset: 1,
        label: 'High carb day',
        notes: 'Higher carbs',
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ] satisfies MealPlanDay[],
    [
      {
        id: 'meal-1',
        meal_plan_day_id: 'day-0',
        sort_order: 0,
        meal_type: 'breakfast',
        name: 'Oats',
        description: null,
        calories_kcal: 400,
        protein_g: 20,
        carbs_g: 50,
        fat_g: 10,
        created_at: '2026-06-01T00:00:00Z',
        updated_at: '2026-06-01T00:00:00Z',
      },
    ] satisfies MealPlanMeal[]
  )

  const activeDay = getTodayMealPlanDay(assignment, days, '2026-06-02')
  assert.equal(activeDay.dayOffset, 1)
  assert.equal(activeDay.day?.id, 'day-1')
  assert.equal(activeDay.planDayLabel, 'High carb day')

  const completed = getTodayMealPlanDay(assignment, days, '2026-06-10')
  assert.equal(completed.planComplete, true)
  assert.equal(completed.day, null)
})

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
