import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { normalizeAppleHealthMetrics } from '@/lib/apple-health/sync'

describe('normalizeAppleHealthMetrics', () => {
  it('merges duplicate dates and sorts chronologically', () => {
    const result = normalizeAppleHealthMetrics([
      { metricDate: '2026-06-20', steps: 8000 },
      { metricDate: '2026-06-19', sleepHours: 7.5 },
      { metricDate: '2026-06-20', hrvMs: 42.5 },
    ])

    assert.deepEqual(result, [
      {
        metricDate: '2026-06-19',
        steps: null,
        sleepHours: 7.5,
        restingHrBpm: null,
        hrvMs: null,
      },
      {
        metricDate: '2026-06-20',
        steps: 8000,
        sleepHours: null,
        restingHrBpm: null,
        hrvMs: 42.5,
      },
    ])
  })
})
