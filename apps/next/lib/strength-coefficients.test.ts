import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  buildBodyweightTimeline,
  getBodyweightAtDate,
} from './bodyweight-timeline'
import {
  calculateDotsScore,
  calculateRelativeStrengthScore,
  calculateWilksScore,
  formatRelativeStrengthScore,
  lbsToKg,
} from './strength-coefficients'

test('calculateDotsScore matches known intermediate male benchmark', () => {
  const score = calculateDotsScore(500, 83, 'male')
  assert.ok(score != null)
  assert.ok(Math.abs(score - 338) < 2)
})

test('calculateWilksScore returns a positive score for valid inputs', () => {
  const score = calculateWilksScore(500, 83, 'male')
  assert.ok(score != null)
  assert.ok(score > 300)
})

test('calculateRelativeStrengthScore converts lbs before scoring', () => {
  const totalLbs = 500 / lbsToKg(1)
  const bodyweightLbs = 83 / lbsToKg(1)
  const score = calculateRelativeStrengthScore(
    totalLbs,
    bodyweightLbs,
    'male',
    'dots'
  )

  assert.ok(score != null)
  assert.ok(Math.abs(score - 338) < 2)
})

test('relative strength helpers reject non-positive inputs', () => {
  assert.equal(calculateDotsScore(0, 83, 'male'), null)
  assert.equal(calculateDotsScore(500, 0, 'male'), null)
  assert.equal(calculateWilksScore(-1, 83, 'male'), null)
})

test('formatRelativeStrengthScore rounds to whole numbers', () => {
  assert.equal(formatRelativeStrengthScore(338.6), '339')
})

test('buildBodyweightTimeline prefers InBody on the same date', () => {
  const timeline = buildBodyweightTimeline(
    [{ scan_date: '2026-03-01T00:00:00.000Z', weight_lbs: 180 }],
    [{ check_in_date: '2026-03-01', weight: 175 }]
  )

  assert.equal(getBodyweightAtDate(timeline, '2026-03-01')?.weightLbs, 180)
  assert.equal(getBodyweightAtDate(timeline, '2026-02-15'), null)
  assert.equal(getBodyweightAtDate(timeline, '2026-03-15')?.weightLbs, 180)
})
