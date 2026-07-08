import assert from 'node:assert/strict'
import test from 'node:test'

import {
  backspaceAtCaret,
  clampCaretIndex,
  insertAtCaret,
} from '@/lib/mobile-keyboard/caret'

test('clampCaretIndex keeps the caret inside the string', () => {
  assert.equal(clampCaretIndex('abc', -1), 0)
  assert.equal(clampCaretIndex('abc', 1.8), 1)
  assert.equal(clampCaretIndex('abc', 99), 3)
})

test('insertAtCaret inserts in the middle and advances the caret', () => {
  assert.deepEqual(insertAtCaret('ac', 1, 'b'), {
    value: 'abc',
    caretIndex: 2,
  })
})

test('backspaceAtCaret deletes the character before the caret', () => {
  assert.deepEqual(backspaceAtCaret('abc', 2), {
    value: 'ac',
    caretIndex: 1,
  })
  assert.deepEqual(backspaceAtCaret('abc', 0), {
    value: 'abc',
    caretIndex: 0,
  })
})
