import assert from 'node:assert/strict'
import test from 'node:test'

import {
  hasNutritionSetupIntake,
  isNutritionSetupFormDue,
} from './nutrition-setup-form'
import type { ClientNutritionProfile } from 'app/types/database'

const baseProfile = {
  client_id: 'client-1',
  coach_id: 'coach-1',
  calories_kcal: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
  fiber_g: null,
  water_ml: null,
  notes: null,
  dietary_restrictions: null,
  supplements: [],
  client_nutrition_notes: null,
  setup_form_requested_at: null,
  setup_form_completed_at: null,
  favorite_foods: null,
  current_calories_kcal: null,
  current_protein_g: null,
  current_carbs_g: null,
  current_fat_g: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
} satisfies ClientNutritionProfile

test('isNutritionSetupFormDue is false without a request', () => {
  assert.equal(isNutritionSetupFormDue(null), false)
  assert.equal(isNutritionSetupFormDue(baseProfile), false)
})

test('isNutritionSetupFormDue is true when requested and not completed', () => {
  assert.equal(
    isNutritionSetupFormDue({
      ...baseProfile,
      setup_form_requested_at: '2026-01-02T00:00:00.000Z',
    }),
    true
  )
})

test('isNutritionSetupFormDue is false when completed after request', () => {
  assert.equal(
    isNutritionSetupFormDue({
      ...baseProfile,
      setup_form_requested_at: '2026-01-02T00:00:00.000Z',
      setup_form_completed_at: '2026-01-03T00:00:00.000Z',
    }),
    false
  )
})

test('isNutritionSetupFormDue is true when re-requested after completion', () => {
  assert.equal(
    isNutritionSetupFormDue({
      ...baseProfile,
      setup_form_requested_at: '2026-01-04T00:00:00.000Z',
      setup_form_completed_at: '2026-01-03T00:00:00.000Z',
    }),
    true
  )
})

test('hasNutritionSetupIntake detects submitted intake fields', () => {
  assert.equal(hasNutritionSetupIntake(baseProfile), false)
  assert.equal(
    hasNutritionSetupIntake({
      ...baseProfile,
      setup_form_completed_at: '2026-01-03T00:00:00.000Z',
      favorite_foods: 'Chicken, rice, berries',
    }),
    true
  )
})
