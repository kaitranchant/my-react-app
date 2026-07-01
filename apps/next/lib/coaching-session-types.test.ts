import assert from 'node:assert/strict'
import test from 'node:test'

import { coachingSessionTypeLabels } from '@/lib/coaching-session-types'

test('coaching session type labels cover all options', () => {
  assert.equal(coachingSessionTypeLabels.coaching, 'Coaching session')
  assert.equal(coachingSessionTypeLabels.nutrition, 'Nutrition')
  assert.equal(coachingSessionTypeLabels.class, 'Class')
})
