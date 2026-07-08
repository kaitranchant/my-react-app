/** Clamp a caret index into the bounds of `value`. */
export function clampCaretIndex(value: string, index: number) {
  if (!Number.isFinite(index)) return value.length
  return Math.max(0, Math.min(value.length, Math.floor(index)))
}

export function insertAtCaret(value: string, caretIndex: number, char: string) {
  const index = clampCaretIndex(value, caretIndex)
  return {
    value: `${value.slice(0, index)}${char}${value.slice(index)}`,
    caretIndex: index + char.length,
  }
}

export function backspaceAtCaret(value: string, caretIndex: number) {
  const index = clampCaretIndex(value, caretIndex)
  if (index <= 0) {
    return { value, caretIndex: 0 }
  }

  return {
    value: `${value.slice(0, index - 1)}${value.slice(index)}`,
    caretIndex: index - 1,
  }
}

/**
 * Best-effort caret index from a click/tap point inside a text container.
 * Falls back to end-of-text when the browser API is unavailable.
 */
export function caretIndexFromPoint(
  container: Element,
  clientX: number,
  clientY: number,
  value: string
): number {
  const doc = container.ownerDocument

  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(clientX, clientY)
    if (range && container.contains(range.startContainer)) {
      return clampCaretIndex(value, textOffsetInContainer(container, range))
    }
  }

  const caretPositionFromPoint = (
    doc as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number
      ) => { offsetNode: Node; offset: number } | null
    }
  ).caretPositionFromPoint

  if (typeof caretPositionFromPoint === 'function') {
    const position = caretPositionFromPoint.call(doc, clientX, clientY)
    if (position && container.contains(position.offsetNode)) {
      const range = doc.createRange()
      range.setStart(position.offsetNode, position.offset)
      range.collapse(true)
      return clampCaretIndex(value, textOffsetInContainer(container, range))
    }
  }

  return value.length
}

function textOffsetInContainer(container: Element, range: Range) {
  const preRange = range.cloneRange()
  preRange.selectNodeContents(container)
  preRange.setEnd(range.startContainer, range.startOffset)
  return preRange.toString().length
}
