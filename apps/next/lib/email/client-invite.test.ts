import assert from 'node:assert/strict'
import test from 'node:test'

import { buildClientInviteEmailContent } from './client-invite'

test('buildClientInviteEmailContent formats client invite email', () => {
  const content = buildClientInviteEmailContent({
    clientName: 'Test Client',
    clientEmail: 'client@example.com',
    coachName: 'Coach Alex',
    inviteUrl: 'https://swiftcoach.vercel.app/signup?invite=token-1',
  })

  assert.match(content.subject, /Coach Alex invited you/)
  assert.match(content.text, /Create your account: https:\/\/swiftcoach\.vercel\.app\/signup\?invite=token-1/)
  assert.match(content.html, /Create your account/)
})
