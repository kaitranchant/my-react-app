import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getMessagePreviewText } from './message-media'
import { formatInboxPreview } from './message-inbox'

describe('getMessagePreviewText', () => {
  it('returns voice label when message has no caption', () => {
    assert.equal(
      getMessagePreviewText({ message_type: 'voice', body: null }),
      'Voice message'
    )
  })

  it('returns caption for voice messages', () => {
    assert.equal(
      getMessagePreviewText({
        message_type: 'voice',
        body: 'Quick check-in',
      }),
      'Quick check-in'
    )
  })
})

describe('formatInboxPreview', () => {
  it('shows voice preview for voice messages', () => {
    assert.equal(
      formatInboxPreview(null, 'coach', 'voice'),
      'You: Voice message'
    )
  })
})
