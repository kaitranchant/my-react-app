import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPortalUnreadMessagesDigestEmailContent } from './portal-unread-messages-digest'

test('buildPortalUnreadMessagesDigestEmailContent formats unread digest email', () => {
  const content = buildPortalUnreadMessagesDigestEmailContent({
    clientName: 'Jake Morrison',
    clientEmail: 'jake@example.com',
    coachName: 'Coach Alex',
    unreadCount: 2,
    latestMessagePreview: 'Great work this week.',
  })

  assert.match(content.subject, /2 unread messages from Coach Alex/)
  assert.match(content.text, /Great work this week/)
  assert.match(content.html, /Open messages in your portal/)
})
