import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPrNotificationEmailContent } from './pr-notification'

test('buildPrNotificationEmailContent formats singular PR email', () => {
  const content = buildPrNotificationEmailContent({
    coachName: 'Coach Alex',
    coachEmail: 'alex@example.com',
    clientName: 'Jake Morrison',
    clientId: 'client-1',
    workoutName: 'Lower A',
    newPrs: [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Back Squat',
        recordType: 'e1rm',
        e1rm: 315,
        weight: null,
        reps: null,
        forced: false,
      },
    ],
  })

  assert.match(content.subject, /Jake Morrison hit a new PR/)
  assert.match(content.text, /Back Squat/)
  assert.match(content.html, /View client/)
})
