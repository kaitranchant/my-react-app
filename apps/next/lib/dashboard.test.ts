import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildActionItems,
  buildFormReviewActivityFeed,
  formatActivityMessage,
  groupRapidActivityItems,
  mergeActivityFeed,
} from './dashboard'
import { isAcwrLoadAlert } from './load-analytics'

const baseClients = [
  {
    id: '1',
    coach_id: 'coach-1',
    full_name: 'Alex',
    status: 'active' as const,
    invite_status: 'accepted' as const,
    is_coach_self: false,
  },
]

test('buildActionItems surfaces monitoring and inbox alerts', () => {
  const items = buildActionItems({
    clients: baseClients,
    pendingInvites: 0,
    clientsWithoutWorkoutThisWeek: 0,
    skippedThisWeek: 0,
    pendingFormReviews: 2,
    elevatedLoadClients: 1,
    injuryFlagClients: 1,
    unreadMessages: 3,
  })

  assert.deepEqual(
    items.map((item) => item.id),
    ['injury-flags', 'pending-form-reviews', 'elevated-load', 'unread-messages']
  )
  assert.equal(items[0]?.href, '/check-ins')
  assert.equal(items[1]?.href, '/form-review')
  assert.equal(items[2]?.href, '/load')
  assert.equal(items[3]?.href, '/messages')
})

test('mergeActivityFeed combines and sorts activity by timestamp', () => {
  const merged = mergeActivityFeed(
    [
      {
        id: 'w1',
        clientId: 'c1',
        clientName: 'Alex',
        kind: 'workout',
        workoutName: 'Leg day',
        status: 'completed',
        timestamp: '2026-06-20T12:00:00.000Z',
      },
    ],
    [
      {
        id: 'ci1',
        clientId: 'c1',
        clientName: 'Alex',
        kind: 'check_in',
        timestamp: '2026-06-21T08:00:00.000Z',
      },
    ]
  )

  assert.equal(merged[0]?.kind, 'check_in')
  assert.equal(merged[1]?.kind, 'workout')
})

test('groupRapidActivityItems groups same-kind events within 15 minutes', () => {
  const grouped = groupRapidActivityItems([
    {
      id: 'ci1',
      clientId: 'c1',
      clientName: 'Kai Tester',
      kind: 'check_in',
      timestamp: '2026-06-21T08:13:00.000Z',
    },
    {
      id: 'ci2',
      clientId: 'c2',
      clientName: 'Jordan Smith',
      kind: 'check_in',
      timestamp: '2026-06-21T08:12:00.000Z',
    },
    {
      id: 'ci3',
      clientId: 'c1',
      clientName: 'Kai Tester',
      kind: 'check_in',
      timestamp: '2026-06-21T08:11:00.000Z',
    },
    {
      id: 'ci4',
      clientId: 'c2',
      clientName: 'Jordan Smith',
      kind: 'check_in',
      timestamp: '2026-06-21T08:00:00.000Z',
    },
  ])

  assert.equal(grouped.length, 1)
  assert.equal(grouped[0]?.clientName, 'Kai Tester and Jordan Smith')
  assert.equal(formatActivityMessage(grouped[0]!), 'each submitted a check-in')
  assert.equal(grouped[0]?.groupedCount, 4)
})

test('groupRapidActivityItems keeps spaced events separate', () => {
  const grouped = groupRapidActivityItems([
    {
      id: 'ci1',
      clientId: 'c1',
      clientName: 'Kai Tester',
      kind: 'check_in',
      timestamp: '2026-06-21T09:00:00.000Z',
    },
    {
      id: 'ci2',
      clientId: 'c2',
      clientName: 'Jordan Smith',
      kind: 'check_in',
      timestamp: '2026-06-21T08:00:00.000Z',
    },
  ])

  assert.equal(grouped.length, 2)
})

test('buildFormReviewActivityFeed formats review activity', () => {
  const items = buildFormReviewActivityFeed([
    {
      id: 'fr1',
      client_id: 'c1',
      title: 'Squat set 3',
      created_at: '2026-06-21T08:00:00.000Z',
      clientName: 'Alex',
    },
  ])

  assert.equal(items[0]?.kind, 'form_review')
  assert.equal(
    formatActivityMessage(items[0]!),
    'submitted form review: Squat set 3'
  )
})

test('isAcwrLoadAlert matches load dashboard alert rules', () => {
  assert.equal(isAcwrLoadAlert('overreaching', 1.8), true)
  assert.equal(isAcwrLoadAlert('borderline', 1.35), true)
  assert.equal(isAcwrLoadAlert('borderline', 1.2), false)
  assert.equal(isAcwrLoadAlert('optimal', 1.1), false)
})
