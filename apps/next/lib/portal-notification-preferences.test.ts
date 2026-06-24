import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePortalNotificationPreferences } from '@/lib/portal-notification-preferences'

test('parsePortalNotificationPreferences defaults team updates to disabled', () => {
  const preferences = parsePortalNotificationPreferences({
    portal_notify_messages: true,
    portal_notify_check_in_reviews: true,
    portal_notify_form_review_replies: false,
    portal_notify_team_updates: false,
  })

  assert.equal(preferences.notifyCoachMessages, true)
  assert.equal(preferences.notifyFormReviewReplies, false)
  assert.equal(preferences.notifyTeamUpdates, false)
})
