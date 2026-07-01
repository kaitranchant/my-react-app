import assert from 'node:assert/strict'
import test from 'node:test'

import { intervalsOverlap } from '@/lib/google-calendar/inbound-sync'

test('intervalsOverlap respects buffer minutes', () => {
  assert.equal(
    intervalsOverlap(
      '2026-07-06T10:00:00.000Z',
      '2026-07-06T11:00:00.000Z',
      '2026-07-06T11:00:00.000Z',
      '2026-07-06T12:00:00.000Z',
      15
    ),
    true
  )

  assert.equal(
    intervalsOverlap(
      '2026-07-06T10:00:00.000Z',
      '2026-07-06T11:00:00.000Z',
      '2026-07-06T11:30:00.000Z',
      '2026-07-06T12:30:00.000Z',
      15
    ),
    false
  )
})

test('intervalsOverlap detects direct overlap', () => {
  assert.equal(
    intervalsOverlap(
      '2026-07-06T10:00:00.000Z',
      '2026-07-06T11:00:00.000Z',
      '2026-07-06T10:30:00.000Z',
      '2026-07-06T11:30:00.000Z',
      0
    ),
    true
  )
})
