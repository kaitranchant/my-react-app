import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMacroAdherenceItems,
  emptyFoodDiaryMacros,
  formatMacroAdherenceLabel,
  getMacroAdherenceStatus,
  groupFoodDiaryByMeal,
  mealPlanMealToDiaryEntries,
  sumFoodDiaryMacros,
} from './food-diary'
import type {
  ClientFoodDiaryEntry,
  ClientNutritionProfile,
  MealPlanMealWithFoods,
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

test('buildMacroAdherenceItems still shows logged macros without targets', () => {
  const items = buildMacroAdherenceItems(sumFoodDiaryMacros(entries), null)
  assert.deepEqual(
    items.map((item) => item.label),
    ['Calories', 'Protein', 'Carbs', 'Fat', 'Fiber']
  )
  assert.equal(items[0]?.consumed, 1000)
  assert.equal(items[0]?.target, null)
  assert.equal(items[0]?.status, 'unknown')
})

test('buildMacroAdherenceItems keeps target-only items when nothing is logged', () => {
  const items = buildMacroAdherenceItems(emptyFoodDiaryMacros(), profile)
  assert.ok(items.every((item) => item.consumed == null && item.target != null))
  assert.equal(items.find((item) => item.label === 'Calories')?.target, 2000)
})

test('formatMacroAdherenceLabel includes consumed even without a target', () => {
  assert.equal(
    formatMacroAdherenceLabel({
      label: 'Calories',
      consumed: 1336,
      target: 1450,
      status: 'hit',
    }),
    'Calories 1336/1450'
  )
  assert.equal(
    formatMacroAdherenceLabel({
      label: 'Protein',
      consumed: 117,
      target: null,
      status: 'unknown',
    }),
    'Protein 117'
  )
})

test('mealPlanMealToDiaryEntries maps foods to diary entries', () => {
  const meal = {
    id: 'meal-1',
    meal_plan_day_id: 'day-1',
    sort_order: 0,
    meal_type: 'breakfast',
    name: 'Protein bowl',
    description: null,
    calories_kcal: 500,
    protein_g: 40,
    carbs_g: 30,
    fat_g: 15,
    created_at: '',
    updated_at: '',
    foods: [
      {
        id: 'food-1',
        meal_plan_meal_id: 'meal-1',
        sort_order: 0,
        food_name: 'Greek yogurt',
        source: 'usda',
        external_id: '123',
        quantity_g: 150,
        calories_kcal: 120,
        protein_g: 15,
        carbs_g: 8,
        fat_g: 2,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'food-2',
        meal_plan_meal_id: 'meal-1',
        sort_order: 1,
        food_name: 'Blueberries',
        source: 'custom',
        external_id: null,
        quantity_g: 80,
        calories_kcal: 45,
        protein_g: 1,
        carbs_g: 10,
        fat_g: 0,
        created_at: '',
        updated_at: '',
      },
    ],
  } satisfies MealPlanMealWithFoods

  const diaryEntries = mealPlanMealToDiaryEntries('2026-06-01', meal)
  assert.equal(diaryEntries.length, 2)
  assert.equal(diaryEntries[0]?.foodName, 'Greek yogurt')
  assert.equal(diaryEntries[0]?.mealType, 'breakfast')
  assert.equal(diaryEntries[1]?.source, 'custom')

  const asDinner = mealPlanMealToDiaryEntries('2026-06-01', meal, 'dinner')
  assert.equal(asDinner[0]?.mealType, 'dinner')
  assert.equal(asDinner[1]?.mealType, 'dinner')
})

test('mealPlanMealToDiaryEntries falls back to meal name when no foods', () => {
  const meal = {
    id: 'meal-2',
    meal_plan_day_id: 'day-1',
    sort_order: 1,
    meal_type: 'lunch',
    name: 'Meal prep chicken',
    description: 'With rice and veggies',
    calories_kcal: 650,
    protein_g: 45,
    carbs_g: 55,
    fat_g: 18,
    created_at: '',
    updated_at: '',
    foods: [],
  } satisfies MealPlanMealWithFoods

  const diaryEntries = mealPlanMealToDiaryEntries('2026-06-01', meal)
  assert.equal(diaryEntries.length, 1)
  assert.equal(diaryEntries[0]?.foodName, 'Meal prep chicken')
  assert.equal(diaryEntries[0]?.caloriesKcal, 650)
  assert.equal(diaryEntries[0]?.mealType, 'lunch')

  const asSnack = mealPlanMealToDiaryEntries('2026-06-01', meal, 'snack')
  assert.equal(asSnack[0]?.mealType, 'snack')
})
