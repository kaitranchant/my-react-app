import assert from 'node:assert/strict'
import test from 'node:test'

import { sumMealPlanMealFoodMacros } from './meal-plan-meal-foods'

test('sumMealPlanMealFoodMacros returns null totals for empty foods', () => {
  assert.deepEqual(sumMealPlanMealFoodMacros([]), {
    caloriesKcal: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
  })
})

test('sumMealPlanMealFoodMacros sums scaled food snapshots', () => {
  const totals = sumMealPlanMealFoodMacros([
    {
      calories_kcal: 240,
      protein_g: 45,
      carbs_g: 0,
      fat_g: 5.2,
    },
    {
      calories_kcal: 130,
      protein_g: 2.7,
      carbs_g: 28,
      fat_g: 0.3,
    },
  ])

  assert.deepEqual(totals, {
    caloriesKcal: 370,
    proteinG: 47.7,
    carbsG: 28,
    fatG: 5.5,
  })
})
