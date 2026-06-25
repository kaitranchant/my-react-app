import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assessMealPlanTargetAlignment,
  formatMealPlanTargetWarning,
} from './meal-plan-target-alignment'

test('assessMealPlanTargetAlignment flags plans below 80% of target', () => {
  const alignment = assessMealPlanTargetAlignment(
    {
      dayCount: 1,
      avgDailyMacros: {
        caloriesKcal: 602,
        proteinG: 40,
        carbsG: 50,
        fatG: 20,
      },
      hasMacroData: true,
    },
    2700
  )

  assert.ok(alignment)
  assert.equal(alignment?.isMisaligned, true)
  assert.equal(alignment?.percentOfTarget, 22)
  assert.match(
    formatMealPlanTargetWarning(alignment!),
    /602 kcal is 2,098 below the 2,700 target\. Consider adding meals\./
  )
})

test('assessMealPlanTargetAlignment returns null without comparable data', () => {
  assert.equal(
    assessMealPlanTargetAlignment(
      { dayCount: 0, avgDailyMacros: null, hasMacroData: false },
      2700
    ),
    null
  )
})
