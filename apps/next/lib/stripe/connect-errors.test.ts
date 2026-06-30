import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatConnectOnboardingError,
  isStripePlatformProfileError,
} from './connect-errors'

test('isStripePlatformProfileError detects Stripe platform profile requirement', () => {
  assert.equal(
    isStripePlatformProfileError(
      'Please review the responsibilities of managing losses for connected accounts at https://dashboard.stripe.com/settings/connect/platform-profile.'
    ),
    true
  )
})

test('formatConnectOnboardingError returns actionable message', () => {
  assert.match(
    formatConnectOnboardingError(
      'Please review the responsibilities of managing losses for connected accounts',
      'live'
    ),
    /live Stripe keys/i
  )
})

test('formatConnectOnboardingError explains live mode HTTPS requirement', () => {
  assert.match(
    formatConnectOnboardingError(
      'Livemode requests must always be redirected via HTTPS.'
    ),
    /APP_URL/i
  )
})

test('formatConnectOnboardingError explains login link before onboarding', () => {
  assert.match(
    formatConnectOnboardingError(
      'Cannot create a login link for an account that has not completed onboarding.'
    ),
    /APP_URL/i
  )
})
