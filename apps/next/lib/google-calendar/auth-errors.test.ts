import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatGoogleCalendarActionError,
  GoogleCalendarAuthError,
  isGoogleCalendarTokenRevokedMessage,
  toGoogleCalendarAuthError,
} from '@/lib/google-calendar/auth-errors'

test('isGoogleCalendarTokenRevokedMessage detects revoked token errors', () => {
  assert.equal(
    isGoogleCalendarTokenRevokedMessage('Token has been expired or revoked.'),
    true
  )
  assert.equal(isGoogleCalendarTokenRevokedMessage('invalid_grant'), true)
  assert.equal(
    isGoogleCalendarTokenRevokedMessage('Google Calendar event create failed'),
    false
  )
})

test('toGoogleCalendarAuthError normalizes generic revoked errors', () => {
  const error = toGoogleCalendarAuthError(
    new Error('Token has been expired or revoked.')
  )

  assert.ok(error)
  assert.equal(error?.code, 'invalid_grant')
})

test('formatGoogleCalendarActionError returns reconnect guidance', () => {
  const message = formatGoogleCalendarActionError(
    new GoogleCalendarAuthError(
      'invalid_grant',
      'Token has been expired or revoked.'
    )
  )

  assert.match(message, /Reconnect Google Calendar/i)
})
