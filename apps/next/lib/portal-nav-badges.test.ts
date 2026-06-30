import assert from 'node:assert/strict'
import test from 'node:test'

import {
  emptyPortalNavBadges,
  resolvePortalNavBadgeCount,
} from './portal-nav-badges'

test('resolvePortalNavBadgeCount hides badges on the active route', () => {
  const badges = {
    ...emptyPortalNavBadges,
    unreadMessages: 2,
    unreadFormReviewReplies: 1,
    checkInDue: true,
    nutritionDue: true,
  }

  assert.equal(
    resolvePortalNavBadgeCount(
      '/portal/messages',
      badges,
      '/portal/messages'
    ),
    0
  )
  assert.equal(
    resolvePortalNavBadgeCount(
      '/portal/messages',
      badges,
      '/portal/workouts'
    ),
    2
  )
  assert.equal(
    resolvePortalNavBadgeCount(
      '/portal/check-in',
      badges,
      '/portal/check-in'
    ),
    0
  )
})

test('resolvePortalNavBadgeCount counts open invoices on billing nav', () => {
  const badges = {
    ...emptyPortalNavBadges,
    openInvoices: 2,
  }

  assert.equal(
    resolvePortalNavBadgeCount('/portal/billing', badges, '/portal/workouts'),
    2
  )
  assert.equal(
    resolvePortalNavBadgeCount('/portal/billing', badges, '/portal/billing'),
    0
  )
})
