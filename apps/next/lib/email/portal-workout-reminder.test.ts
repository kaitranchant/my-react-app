import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPortalWorkoutReminderEmailContent } from './portal-workout-reminder'

test('buildPortalWorkoutReminderEmailContent formats workout reminder email', () => {
  const content = buildPortalWorkoutReminderEmailContent({
    clientName: 'Jake Morrison',
    clientEmail: 'jake@example.com',
    coachName: 'Coach Alex',
    workoutName: 'Lower Body A',
  })

  assert.match(content.subject, /Workout today: Lower Body A/)
  assert.match(content.text, /scheduled for today/)
  assert.match(content.html, /Open training in your portal/)
})
