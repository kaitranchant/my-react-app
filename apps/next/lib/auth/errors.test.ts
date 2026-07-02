import assert from 'node:assert/strict'
import test from 'node:test'

import { formatSupabaseAuthError } from './errors'

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
    'Something went wrong. Please try again.'
  )
})
