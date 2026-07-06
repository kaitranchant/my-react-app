import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMacroAdherenceItems,
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
})
