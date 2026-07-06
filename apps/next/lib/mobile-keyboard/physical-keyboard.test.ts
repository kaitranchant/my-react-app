import assert from 'node:assert/strict'
import test from 'node:test'

import { isLikelyPhysicalKey } from '@/lib/mobile-keyboard/physical-keyboard'

test('isLikelyPhysicalKey ignores modifier-only keys', () => {
  assert.equal(
    isLikelyPhysicalKey({ key: 'Shift', isComposing: false }),
    false
  )
  assert.equal(
    isLikelyPhysicalKey({ key: 'Meta', isComposing: false }),
    false
  )
})

test('isLikelyPhysicalKey accepts printable typing keys', () => {
  assert.equal(isLikelyPhysicalKey({ key: 'a', isComposing: false }), true)
  assert.equal(isLikelyPhysicalKey({ key: 'Enter', isComposing: false }), true)
  assert.equal(isLikelyPhysicalKey({ key: 'Backspace', isComposing: false }), true)
})

test('isLikelyPhysicalKey ignores composing and unidentified keys', () => {
  assert.equal(
    isLikelyPhysicalKey({ key: 'a', isComposing: true }),
    false
  )
  assert.equal(
    isLikelyPhysicalKey({ key: 'Unidentified', isComposing: false }),
    false
  )
})
