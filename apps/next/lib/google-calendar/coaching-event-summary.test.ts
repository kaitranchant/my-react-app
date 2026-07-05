import assert from 'node:assert/strict'
import test from 'node:test'

import { isExportedCoachingCalendarSummary } from './coaching-event-summary'

test('isExportedCoachingCalendarSummary matches app-exported session titles', () => {
  assert.equal(
    isExportedCoachingCalendarSummary('Coaching session — Kai Tranchant'),
    true
  )
  assert.equal(
    isExportedCoachingCalendarSummary('Class — Lisa Norwood'),
    true
  )
  assert.equal(isExportedCoachingCalendarSummary('Team meeting'), false)
})
