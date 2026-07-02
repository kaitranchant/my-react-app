import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeSeriesHorizonDays,
  countWeekIndexesThroughHorizon,
  getWeekIndexFromAnchor,
  offsetStartsAtByWeeks,
} from './appointment-series'

test('computeSeriesHorizonDays uses at least the minimum rolling window', () => {
  assert.equal(computeSeriesHorizonDays(30), 84)
  assert.equal(computeSeriesHorizonDays(120), 120)
})

test('offsetStartsAtByWeeks advances in seven-day steps', () => {
  assert.equal(
    offsetStartsAtByWeeks('2026-06-01T15:00:00.000Z', 2),
    '2026-06-15T15:00:00.000Z'
  )
})

test('getWeekIndexFromAnchor returns zero-based week offset', () => {
  assert.equal(
    getWeekIndexFromAnchor(
      '2026-06-01T15:00:00.000Z',
      '2026-06-15T15:00:00.000Z'
    ),
    2
  )
})

test('countWeekIndexesThroughHorizon includes anchor week through horizon', () => {
  const indexes = countWeekIndexesThroughHorizon(
    '2026-06-01T15:00:00.000Z',
    new Date('2026-06-22T15:00:00.000Z')
  )

  assert.deepEqual(indexes, [0, 1, 2, 3])
})
