import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getCheckInDueReferenceKey,
  shouldSendCheckInDueNudge,
} from './client-nudges'

test('shouldSendCheckInDueNudge skips when check-in already submitted', () => {
  assert.equal(
    shouldSendCheckInDueNudge('weekly', '2025-06-22', '2025-06-22', true),
    false
  )
})

test('shouldSendCheckInDueNudge sends daily when due', () => {
  assert.equal(
    shouldSendCheckInDueNudge('daily', '2025-06-22', '2025-06-22', false),
    true
  )
})

test('shouldSendCheckInDueNudge sends weekly only on period end', () => {
  assert.equal(
    shouldSendCheckInDueNudge('weekly', '2025-06-20', '2025-06-22', false),
    false
  )
  assert.equal(
    shouldSendCheckInDueNudge('weekly', '2025-06-22', '2025-06-22', false),
    true
  )
})

test('getCheckInDueReferenceKey uses date for daily cadence', () => {
  assert.equal(
    getCheckInDueReferenceKey('daily', '2025-06-22', '2025-06-22', '2025-06-22'),
    '2025-06-22'
  )
})

test('getCheckInDueReferenceKey uses period bounds for weekly cadence', () => {
  assert.equal(
    getCheckInDueReferenceKey(
      'weekly',
      '2025-06-22',
      '2025-06-16',
      '2025-06-22'
    ),
    '2025-06-16:2025-06-22'
  )
})
