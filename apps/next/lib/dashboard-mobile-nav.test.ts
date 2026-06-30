import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getDashboardOverflowMobileNavGroups,
  getDashboardOverflowMobileNavItems,
} from './dashboard-mobile-nav'

test('mobile overflow nav includes billing from postNavGroupItems', () => {
  const overflowItems = getDashboardOverflowMobileNavItems()
  assert.ok(
    overflowItems.some((item) => item.href === '/billing'),
    'expected /billing in overflow items'
  )

  const overflowGroups = getDashboardOverflowMobileNavGroups()
  const billingGroup = overflowGroups.find((group) => group.label === 'Billing')

  assert.ok(billingGroup, 'expected Billing section in mobile overflow groups')
  assert.ok(
    billingGroup.items.some((item) => item.href === '/billing'),
    'expected /billing link in Billing overflow section'
  )
})
