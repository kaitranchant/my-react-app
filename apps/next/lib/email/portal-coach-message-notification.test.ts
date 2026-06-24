import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPortalCoachMessageEmailContent } from './portal-coach-message-notification'

test('buildPortalCoachMessageEmailContent formats coach message email', () => {
  const content = buildPortalCoachMessageEmailContent({
    clientName: 'Jake Morrison',
    clientEmail: 'jake@example.com',
    coachName: 'Coach Alex',
    messagePreview: 'Great work this week. Let us dial in squat depth on Friday.',
  })

  assert.match(content.subject, /New message from Coach Alex/)
  assert.match(content.text, /Great work this week/)
  assert.match(content.html, /Open messages in your portal/)
})
