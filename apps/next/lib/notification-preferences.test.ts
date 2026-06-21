import assert from 'node:assert/strict'
import test from 'node:test'

import type { ActionItem, ActivityItem } from '@/lib/dashboard'
import {
  defaultNotificationPreferences,
  filterActionItemsForNotifications,
  filterActivityFeedForNotifications,
  parseNotificationPreferences,
} from '@/lib/notification-preferences'

const sampleActionItems: ActionItem[] = [
  {
    id: 'pending-check-ins',
    message: '2 client check-ins awaiting review',
    href: '/check-ins',
    priority: 'high',
  },
  {
    id: 'pending-form-reviews',
    message: '1 form review awaiting feedback',
    href: '/form-review',
    priority: 'high',
  },
  {
    id: 'invites',
    message: '1 client invite awaiting signup',
    href: '/clients?status=active',
    priority: 'medium',
  },
]

const sampleActivityItems: ActivityItem[] = [
  {
    id: 'ci1',
    clientId: 'c1',
    clientName: 'Alex',
    kind: 'check_in',
    timestamp: '2026-06-21T08:00:00.000Z',
  },
  {
    id: 'fr1',
    clientId: 'c1',
    clientName: 'Alex',
    kind: 'form_review',
    formReviewTitle: 'Squat set 3',
    timestamp: '2026-06-21T09:00:00.000Z',
  },
  {
    id: 'w1',
    clientId: 'c1',
    clientName: 'Alex',
    kind: 'workout',
    workoutName: 'Leg day',
    status: 'completed',
    timestamp: '2026-06-20T12:00:00.000Z',
  },
]

test('parseNotificationPreferences defaults form reviews to enabled', () => {
  const preferences = parseNotificationPreferences({
    notify_check_ins: true,
    notify_workout_completions: true,
    notify_missed_sessions: false,
    notify_invite_accepted: true,
    notify_weekly_summary: false,
  })

  assert.equal(preferences.notifyFormReviews, true)
})

test('filterActionItemsForNotifications respects form review toggle', () => {
  const filtered = filterActionItemsForNotifications(sampleActionItems, {
    ...defaultNotificationPreferences,
    notifyCheckIns: true,
    notifyFormReviews: false,
    notifyInviteAccepted: true,
  })

  assert.deepEqual(
    filtered.map((item) => item.id),
    ['pending-check-ins', 'invites']
  )
})

test('filterActivityFeedForNotifications splits check-ins and form reviews', () => {
  const checkInsOnly = filterActivityFeedForNotifications(sampleActivityItems, {
    ...defaultNotificationPreferences,
    notifyCheckIns: true,
    notifyFormReviews: false,
    notifyWorkoutCompletions: true,
  })

  assert.deepEqual(
    checkInsOnly.map((item) => item.kind),
    ['check_in', 'workout']
  )

  const formReviewsOnly = filterActivityFeedForNotifications(sampleActivityItems, {
    ...defaultNotificationPreferences,
    notifyCheckIns: false,
    notifyFormReviews: true,
    notifyWorkoutCompletions: true,
  })

  assert.deepEqual(
    formReviewsOnly.map((item) => item.kind),
    ['form_review', 'workout']
  )
})
