import assert from 'node:assert/strict'
import test from 'node:test'

import {
  defaultDashboardPreferences,
  parseDashboardPreferences,
} from '@/lib/dashboard-preferences'

test('parseDashboardPreferences falls back to defaults', () => {
  assert.deepEqual(parseDashboardPreferences(null), defaultDashboardPreferences)
  assert.deepEqual(parseDashboardPreferences({}), defaultDashboardPreferences)
})

test('parseDashboardPreferences merges partial overrides', () => {
  const parsed = parseDashboardPreferences({
    stats: false,
    recentActivity: false,
  })

  assert.equal(parsed.stats, false)
  assert.equal(parsed.recentActivity, false)
  assert.equal(parsed.quickActions, true)
  assert.equal(parsed.highPriorityTasks, true)
})
