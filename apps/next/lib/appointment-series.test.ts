import assert from 'node:assert/strict'
import test from 'node:test'

import {
  computeSeriesHorizonDays,
  countWeekIndexesThroughHorizon,
  getLatestSeriesWeekIndex,
  getWeekIndexFromAnchor,
  isOrphanSeriesOccurrenceAtOrAfterWeek,
  isSeriesOccurrenceAtOrAfterWeek,
  offsetStartsAtByWeeks,
} from './appointment-series'

const easternSchedule = {
  timezone: 'America/New_York' as const,
}

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

test('offsetStartsAtByWeeks keeps weekly cadence from anchor instant', () => {
  const anchor = '2026-03-08T22:30:00.000Z'

  assert.equal(
    offsetStartsAtByWeeks(anchor, 1),
    '2026-03-15T22:30:00.000Z'
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

test('getWeekIndexFromAnchor uses coach timezone calendar weeks', () => {
  const anchor = '2026-03-08T22:30:00.000Z'
  const weekTwo = '2026-03-22T22:30:00.000Z'

  assert.equal(getWeekIndexFromAnchor(anchor, weekTwo, easternSchedule), 2)
})

test('getLatestSeriesWeekIndex returns the highest booked week', () => {
  const anchor = '2026-06-01T15:00:00.000Z'

  assert.equal(
    getLatestSeriesWeekIndex(anchor, [
      '2026-06-01T15:00:00.000Z',
      '2026-06-15T15:00:00.000Z',
      '2026-06-08T15:00:00.000Z',
    ]),
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

test('isSeriesOccurrenceAtOrAfterWeek uses anchor week index, not calendar ordering', () => {
  const anchor = '2026-06-01T15:00:00.000Z'
  const weekTwo = '2026-06-15T15:00:00.000Z'
  const weekThree = '2026-06-22T15:00:00.000Z'

  assert.equal(isSeriesOccurrenceAtOrAfterWeek(anchor, weekTwo, 2), true)
  assert.equal(isSeriesOccurrenceAtOrAfterWeek(anchor, weekThree, 2), true)
  assert.equal(isSeriesOccurrenceAtOrAfterWeek(anchor, weekTwo, 3), false)
})

test('isOrphanSeriesOccurrenceAtOrAfterWeek requires exact weekly slot match', () => {
  const anchor = '2026-06-01T15:00:00.000Z'
  const weekTwo = '2026-06-15T15:00:00.000Z'

  assert.equal(
    isOrphanSeriesOccurrenceAtOrAfterWeek(anchor, weekTwo, 2),
    true
  )
  assert.equal(
    isOrphanSeriesOccurrenceAtOrAfterWeek(
      anchor,
      '2026-06-16T15:00:00.000Z',
      2
    ),
    false
  )
})
