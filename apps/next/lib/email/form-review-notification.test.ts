import assert from 'node:assert/strict'
import test from 'node:test'

import { buildFormReviewNotificationEmailContent } from './form-review-notification'

test('buildFormReviewNotificationEmailContent formats form review email', () => {
  const content = buildFormReviewNotificationEmailContent({
    coachName: 'Coach Alex',
    coachEmail: 'alex@example.com',
    clientName: 'Jake Morrison',
    clientId: 'client-1',
    review: {
      title: 'Squat depth check',
      content_type: 'video/mp4',
      client_notes: 'Feels heavy off the floor.',
      scheduled_workout_id: 'workout-1',
      exercise: { name: 'Back Squat' },
    },
    workoutName: 'Lower A',
  })

  assert.match(content.subject, /Jake Morrison submitted a form review/)
  assert.match(content.subject, /Squat depth check/)
  assert.match(content.text, /Feels heavy off the floor/)
  assert.match(content.text, /Lower A/)
  assert.match(content.html, /Open form review inbox/)
})
