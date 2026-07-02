import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatSupabaseAuthError,
  isEmailNotConfirmedError,
  normalizeAuthFormError,
} from './errors'

test('formatSupabaseAuthError maps user already exists', () => {
  assert.equal(
    formatSupabaseAuthError({
      code: 'user_already_exists',
      message: 'User already registered',
    }),
    'USER_ALREADY_EXISTS'
  )
})

test('formatSupabaseAuthError falls back when message is missing', () => {
  assert.equal(
    formatSupabaseAuthError({ code: 'unexpected_failure' }),
    'Sign up failed (unexpected_failure). Please try again.'
  )
})

test('normalizeAuthFormError maps empty object strings to a friendly message', () => {
  assert.equal(normalizeAuthFormError('{}'), 'Something went wrong. Please try again.')
})

test('isEmailNotConfirmedError detects unconfirmed auth errors', () => {
  assert.equal(
    isEmailNotConfirmedError({
      code: 'email_not_confirmed',
      message: 'Email not confirmed',
    }),
    true
  )
})
