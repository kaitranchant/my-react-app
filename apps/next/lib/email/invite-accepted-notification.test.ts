import assert from 'node:assert/strict'
import test from 'node:test'

import { buildInviteAcceptedNotificationEmailContent } from './invite-accepted-notification'

test('buildInviteAcceptedNotificationEmailContent formats invite accepted email', () => {
  const content = buildInviteAcceptedNotificationEmailContent({
    coachName: 'Coach Alex',
    coachEmail: 'alex@example.com',
    clientName: 'Jake Morrison',
    clientId: 'client-1',
    programAssigned: true,
  })

  assert.match(content.subject, /Jake Morrison joined your coaching portal/)
  assert.match(content.text, /accepted your invite/)
  assert.match(content.text, /default onboarding program was assigned/)
  assert.match(content.html, /View client/)
})

test('buildInviteAcceptedNotificationEmailContent omits program line when not assigned', () => {
  const content = buildInviteAcceptedNotificationEmailContent({
    coachName: 'Coach Alex',
    coachEmail: 'alex@example.com',
    clientName: 'Jake Morrison',
    clientId: 'client-1',
  })

  assert.doesNotMatch(content.text, /default onboarding program/)
})
