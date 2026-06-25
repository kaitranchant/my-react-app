import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMacroAdherenceItems,
  getMacroAdherenceStatus,
  groupFoodDiaryByMeal,
  sumFoodDiaryMacros,
} from './food-diary'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionProfile,
} from 'app/types/database'

const profile = {
  calories_kcal: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 65,
  fiber_g: 30,
  water_ml: 2500,
} as ClientNutritionProfile

const entries: ClientFoodDiaryEntry[] = [
  {
    id: '1',
    client_id: 'c1',
    coach_id: 'coach1',
    log_date: '2026-06-01',
    meal_type: 'breakfast',
    food_name: 'Oatmeal',
    calories_kcal: 400,
    protein_g: 20,
    carbs_g: 60,
    fat_g: 10,
    fiber_g: 8,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    client_id: 'c1',
    coach_id: 'coach1',
    log_date: '2026-06-01',
    meal_type: 'lunch',
    food_name: 'Chicken salad',
    calories_kcal: 600,
    protein_g: 45,
    carbs_g: 30,
    fat_g: 25,
    fiber_g: 5,
    sort_order: 0,
    created_at: '',
    updated_at: '',
  },
]

test('sumFoodDiaryMacros totals entries', () => {
  const totals = sumFoodDiaryMacros(entries)
  assert.equal(totals.caloriesKcal, 1000)
  assert.equal(totals.proteinG, 65)
  assert.equal(totals.fiberG, 13)
})

test('groupFoodDiaryByMeal groups by meal type', () => {
  const groups = groupFoodDiaryByMeal(entries)
  assert.equal(groups.length, 2)
  assert.equal(groups[0]?.mealType, 'breakfast')
})

test('getMacroAdherenceStatus classifies proximity to target', () => {
  assert.equal(getMacroAdherenceStatus(950, 1000), 'hit')
  assert.equal(getMacroAdherenceStatus(800, 1000), 'close')
  assert.equal(getMacroAdherenceStatus(500, 1000), 'miss')
})

test('buildMacroAdherenceItems compares consumed vs profile targets', () => {
  const items = buildMacroAdherenceItems(
    sumFoodDiaryMacros(entries),
    profile,
    2400,
    28
  )
  assert.ok(items.some((item) => item.label === 'Calories'))
  assert.ok(items.some((item) => item.label === 'Water' && item.status === 'hit'))
})
