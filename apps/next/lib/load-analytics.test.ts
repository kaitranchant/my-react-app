import assert from 'node:assert/strict'
import test from 'node:test'

import {
  aggregateWeeklyVolume,
  calcAcwr,
  calcSetVolume,
  detectSessionPrs,
} from './load-analytics'
import { DEFAULT_TRACKING_OPTIONS } from './scheduled-exercise'

test('calcSetVolume respects tracking flags', () => {
  assert.equal(calcSetVolume(100, 10, DEFAULT_TRACKING_OPTIONS), 1000)
  assert.equal(
    calcSetVolume(100, 10, { ...DEFAULT_TRACKING_OPTIONS, trackVolume: false }),
    0
  )
  assert.equal(
    calcSetVolume(100, 10, { ...DEFAULT_TRACKING_OPTIONS, bodyweight: true }),
    0
  )
})

test('detectSessionPrs skips when PR tracking disabled', () => {
  const results = detectSessionPrs(
    [{ weight: 200, reps: 5, completed: true }],
    null,
    { ...DEFAULT_TRACKING_OPTIONS, disablePrTracking: true }
  )
  assert.equal(results.length, 0)
})

test('detectSessionPrs records first e1rm and top set', () => {
  const results = detectSessionPrs(
    [{ weight: 135, reps: 10, completed: true }],
    null,
    DEFAULT_TRACKING_OPTIONS
  )
  assert.equal(results.length, 2)
  assert.ok(results.some((row) => row.recordType === 'e1rm'))
  assert.ok(results.some((row) => row.recordType === 'top_set'))
})

test('detectSessionPrs honors forcePrUpdate', () => {
  const results = detectSessionPrs(
    [{ weight: 100, reps: 5, completed: true }],
    { e1rm: 200, topSetWeight: 200, topSetReps: 5 },
    { ...DEFAULT_TRACKING_OPTIONS, forcePrUpdate: true }
  )
  assert.equal(results.length, 2)
  assert.ok(results.every((row) => row.forced))
})

test('aggregateWeeklyVolume buckets by week', () => {
  const rows = [
    { dateKey: '2026-06-16', volume: 1000 },
    { dateKey: '2026-06-17', volume: 500 },
    { dateKey: '2026-06-09', volume: 800 },
  ]
  const buckets = aggregateWeeklyVolume(rows, 2, new Date('2026-06-18'))
  assert.equal(buckets.length, 2)
  assert.equal(buckets[0].volume, 800)
  assert.equal(buckets[1].volume, 1500)
})

test('calcAcwr returns unknown when chronic load is zero', () => {
  const result = calcAcwr([], new Date('2026-06-18'))
  assert.equal(result.ratio, null)
  assert.equal(result.label, 'unknown')
})

test('calcAcwr returns unknown with only one prior week of volume', () => {
  const result = calcAcwr(
    [{ dateKey: '2026-06-26', volume: 15000 }],
    new Date('2026-07-06')
  )
  assert.equal(result.ratio, null)
  assert.equal(result.riskLevel, 'unknown')
})

test('calcAcwr computes ratio once two prior weeks have volume', () => {
  const result = calcAcwr(
    [
      { dateKey: '2026-06-16', volume: 12000 },
      { dateKey: '2026-06-26', volume: 15000 },
    ],
    new Date('2026-07-06')
  )
  assert.ok(result.ratio != null)
  assert.notEqual(result.riskLevel, 'unknown')
})

test('calcAcwr flags elevated load', () => {
  const rows = [
    { dateKey: '2026-06-12', volume: 1000 },
    { dateKey: '2026-06-13', volume: 1000 },
    { dateKey: '2026-06-14', volume: 1000 },
    { dateKey: '2026-06-15', volume: 1000 },
    { dateKey: '2026-06-16', volume: 1000 },
    { dateKey: '2026-06-17', volume: 1000 },
    { dateKey: '2026-06-18', volume: 1000 },
    { dateKey: '2026-05-26', volume: 100 },
    { dateKey: '2026-06-02', volume: 100 },
    { dateKey: '2026-06-09', volume: 100 },
  ]
  const result = calcAcwr(rows, new Date('2026-06-18'))
  assert.ok(result.ratio != null)
  assert.equal(result.label, 'overreaching')
})
