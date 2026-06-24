import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPortalCheckInDueReminderEmailContent } from './portal-check-in-due-reminder'

test('buildPortalCheckInDueReminderEmailContent formats check-in due email', () => {
  const content = buildPortalCheckInDueReminderEmailContent({
    clientName: 'Jake Morrison',
    clientEmail: 'jake@example.com',
    coachName: 'Coach Alex',
    dueLabel: 'Check in this week',
  })

  assert.match(content.subject, /Check-in due/)
  assert.match(content.text, /Check in this week/)
  assert.match(content.html, /Submit your check-in/)
})
