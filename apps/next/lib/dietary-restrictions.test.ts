import assert from 'node:assert/strict'
import test from 'node:test'

import {
  parseDietaryRestrictions,
  serializeDietaryRestrictions,
} from './dietary-restrictions'

test('parseDietaryRestrictions splits presets and custom entries', () => {
  const parsed = parseDietaryRestrictions('Gluten-free, vegan, Shellfish allergy')
  assert.deepEqual(parsed.presets, ['Gluten-free', 'Vegan'])
  assert.deepEqual(parsed.custom, ['Shellfish allergy'])
})

test('parseDietaryRestrictions splits multiple custom entries', () => {
  const parsed = parseDietaryRestrictions('Shellfish allergy, Soy allergy')
  assert.deepEqual(parsed.presets, [])
  assert.deepEqual(parsed.custom, ['Shellfish allergy', 'Soy allergy'])
})

test('serializeDietaryRestrictions round-trips selections', () => {
  const serialized = serializeDietaryRestrictions(
    ['Gluten-free', 'Vegan'],
    ['Shellfish allergy']
  )
  assert.equal(serialized, 'Gluten-free, Vegan, Shellfish allergy')
})
