import assert from 'node:assert/strict'
import test from 'node:test'

import {
  intervalsOverlap,
  isLinkedCoachingGoogleEvent,
} from '@/lib/google-calendar/event-linking'

test('intervalsOverlap detects partial overlap', () => {
  assert.equal(
    intervalsOverlap(
      '2026-07-06T20:00:00.000Z',
      '2026-07-06T21:00:00.000Z',
      '2026-07-06T20:30:00.000Z',
      '2026-07-06T21:30:00.000Z'
    ),
    true
  )
  assert.equal(
    intervalsOverlap(
      '2026-07-06T20:00:00.000Z',
      '2026-07-06T21:00:00.000Z',
      '2026-07-06T21:00:00.000Z',
      '2026-07-06T22:00:00.000Z'
    ),
    false
  )
})

test('isLinkedCoachingGoogleEvent matches exact and recurring instance IDs', () => {
  const linked = new Set(['abc123'])

  assert.equal(isLinkedCoachingGoogleEvent('abc123', linked), true)
  assert.equal(
    isLinkedCoachingGoogleEvent('abc123_20260706T203000Z', linked),
    true
  )
  assert.equal(isLinkedCoachingGoogleEvent('xyz789', linked), false)
})
