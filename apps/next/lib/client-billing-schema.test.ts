import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findClientBillingSchemaError,
  isClientBillingSchemaError,
} from './client-billing-schema'

test('isClientBillingSchemaError detects missing connect columns', () => {
  assert.equal(
    isClientBillingSchemaError(
      'column profiles.stripe_connect_account_id does not exist'
    ),
    true
  )
})

test('findClientBillingSchemaError returns the first matching error', () => {
  assert.equal(
    findClientBillingSchemaError([
      null,
      { message: 'column profiles.stripe_connect_account_id does not exist' },
    ]),
    'column profiles.stripe_connect_account_id does not exist'
  )
})
