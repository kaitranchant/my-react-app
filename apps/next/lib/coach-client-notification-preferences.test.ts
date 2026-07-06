import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isCoachClientNotificationEnabledFromProfile,
  parseCoachClientNotificationPreferences,
} from '@/lib/coach-client-notification-preferences'

test('parseCoachClientNotificationPreferences defaults all outbound client notifications to enabled', () => {
  const preferences = parseCoachClientNotificationPreferences(null)

  assert.equal(preferences.sendClientMessages, true)
  assert.equal(preferences.sendClientTeamUpdates, true)
  assert.equal(preferences.sendClientInvites, true)
  assert.equal(preferences.sendClientUnreadDigest, true)
})

test('parseCoachClientNotificationPreferences reads stored coach toggles', () => {
  const preferences = parseCoachClientNotificationPreferences({
    coach_send_client_messages: false,
    coach_send_client_check_in_reviews: true,
    coach_send_client_form_review_replies: true,
    coach_send_client_nutrition_setup: false,
    coach_send_client_team_updates: true,
    coach_send_client_invites: false,
    coach_send_client_workout_reminders: true,
    coach_send_client_check_in_reminders: false,
    coach_send_client_unread_digest: true,
    coach_send_client_appointment_reminders: false,
    coach_send_client_onboarding_documents: true,
  })

  assert.equal(preferences.sendClientMessages, false)
  assert.equal(preferences.sendClientNutritionSetup, false)
  assert.equal(preferences.sendClientInvites, false)
  assert.equal(preferences.sendClientCheckInReminders, false)
  assert.equal(preferences.sendClientAppointmentReminders, false)
})

test('isCoachClientNotificationEnabledFromProfile respects individual keys', () => {
  const row = {
    coach_send_client_messages: true,
    coach_send_client_check_in_reviews: true,
    coach_send_client_form_review_replies: true,
    coach_send_client_nutrition_setup: true,
    coach_send_client_team_updates: false,
    coach_send_client_invites: true,
    coach_send_client_workout_reminders: true,
    coach_send_client_check_in_reminders: true,
    coach_send_client_unread_digest: true,
    coach_send_client_appointment_reminders: true,
  }

  assert.equal(
    isCoachClientNotificationEnabledFromProfile(row, 'sendClientTeamUpdates'),
    false
  )
  assert.equal(
    isCoachClientNotificationEnabledFromProfile(row, 'sendClientMessages'),
    true
  )
})
