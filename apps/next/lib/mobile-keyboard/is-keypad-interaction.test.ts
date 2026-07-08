import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldIgnoreOutsideDismiss } from '@/lib/mobile-keyboard/is-keypad-interaction'

test('ignores taps that land on the keypad itself', () => {
  assert.equal(
    shouldIgnoreOutsideDismiss({
      keyboardOpen: false,
      targetIsKeypad: true,
      targetIsDocumentFocus: false,
    }),
    true
  )
})

test('ignores document/body focus loss while the keyboard is open', () => {
  assert.equal(
    shouldIgnoreOutsideDismiss({
      keyboardOpen: true,
      targetIsKeypad: false,
      targetIsDocumentFocus: true,
    }),
    true
  )
})

test('still dismisses on real outside taps while the keyboard is open', () => {
  assert.equal(
    shouldIgnoreOutsideDismiss({
      keyboardOpen: true,
      targetIsKeypad: false,
      targetIsDocumentFocus: false,
    }),
    false
  )
})

test('does not ignore document focus when the keyboard is closed', () => {
  assert.equal(
    shouldIgnoreOutsideDismiss({
      keyboardOpen: false,
      targetIsKeypad: false,
      targetIsDocumentFocus: true,
    }),
    false
  )
})
