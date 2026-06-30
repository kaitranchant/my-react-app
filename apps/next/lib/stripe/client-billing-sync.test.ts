import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getLocalInvoiceIdFromMetadata,
  getLocalSubscriptionIdFromMetadata,
  isClientBillingMetadata,
} from './client-billing-sync'

test('isClientBillingMetadata identifies client billing scope', () => {
  assert.equal(isClientBillingMetadata({ billing_scope: 'client' }), true)
  assert.equal(isClientBillingMetadata({ billing_scope: 'coach' }), false)
  assert.equal(isClientBillingMetadata(null), false)
})

test('metadata helpers return local record ids', () => {
  assert.equal(
    getLocalInvoiceIdFromMetadata({ local_invoice_id: 'abc-123' }),
    'abc-123'
  )
  assert.equal(
    getLocalSubscriptionIdFromMetadata({ local_subscription_id: 'sub-456' }),
    'sub-456'
  )
  assert.equal(getLocalInvoiceIdFromMetadata({}), null)
})
