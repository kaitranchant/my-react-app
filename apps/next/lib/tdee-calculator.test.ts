import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateBmr, calculateTdee } from './tdee-calculator'

test('calculateBmr uses Mifflin-St Jeor for males', () => {
  const bmr = calculateBmr(180, 70, 30, 'male')
  assert.ok(bmr > 1600 && bmr < 2200)
})

test('calculateTdee applies activity multiplier and goal adjustment', () => {
  const result = calculateTdee({
    weightLbs: 180,
    heightIn: 70,
    age: 30,
    sex: 'male',
    activityLevel: 'moderate',
    goal: 'lose',
  })

  assert.ok(result.tdee > result.bmr)
  assert.equal(result.targetCalories, result.tdee - 500)
  assert.ok(result.suggestedProteinG > 0)
  assert.ok(
    result.proteinPercent + result.carbsPercent + result.fatPercent >= 99
  )
})
