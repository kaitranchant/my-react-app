import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateE1rm, isOnPrPace } from './workout-log'

test('isOnPrPace is false when there is no baseline to beat', () => {
  assert.equal(isOnPrPace(225, null, null), false)
  assert.equal(isOnPrPace(null, 315, 280), false)
})

test('isOnPrPace requires beating all-time when present', () => {
  assert.equal(isOnPrPace(300, 315, 280), false)
  assert.equal(isOnPrPace(315, 315, 280), false)
  assert.equal(isOnPrPace(316, 315, 280), true)
})

test('isOnPrPace falls back to previous-session e1RM when all-time is missing', () => {
  assert.equal(isOnPrPace(250, null, 280), false)
  assert.equal(isOnPrPace(280, null, 280), false)
  assert.equal(isOnPrPace(281, null, 280), true)
})

test('isOnPrPace uses the higher of all-time and previous', () => {
  // Stale all-time below last session should not falsely flag PR pace
  assert.equal(isOnPrPace(300, 290, 310), false)
  assert.equal(isOnPrPace(311, 290, 310), true)
})

test('typical logged set only flags PR pace when Epley e1RM beats the bar', () => {
  const allTime = 315
  const below = calculateE1rm(225, 5) // 263
  const above = calculateE1rm(285, 5) // 333

  assert.ok(below != null && below < allTime)
  assert.ok(above != null && above > allTime)
  assert.equal(isOnPrPace(below, allTime, null), false)
  assert.equal(isOnPrPace(above, allTime, null), true)
})
