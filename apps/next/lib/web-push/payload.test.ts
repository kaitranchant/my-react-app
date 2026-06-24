import assert from 'node:assert/strict'
import test from 'node:test'

import {
  serializeWebPushPayload,
  type WebPushPayload,
} from '@/lib/web-push/payload'

test('serializeWebPushPayload includes notification fields', () => {
  const payload: WebPushPayload = {
    title: 'New message',
    body: 'Hello from your coach',
    url: '/portal/messages',
    tag: 'client-message-1',
  }

  assert.equal(
    serializeWebPushPayload(payload),
    JSON.stringify(payload)
  )
})
