export type MobileKeyboardMode = 'text' | 'numeric' | 'decimal' | 'email' | 'tel'

const NATIVE_ONLY_TYPES = new Set([
  'password',
  'file',
  'date',
  'time',
  'checkbox',
  'radio',
  'hidden',
  'color',
  'range',
  'submit',
  'button',
  'reset',
])

export function shouldUseNativeKeyboardType(type?: string) {
  if (!type) return false
  return NATIVE_ONLY_TYPES.has(type)
}

export function resolveKeyboardMode({
  type,
  inputMode,
  autoComplete,
  multiline = false,
  name,
  id,
}: {
  type?: string
  inputMode?: string
  autoComplete?: string
  multiline?: boolean
  name?: string
  id?: string
}): MobileKeyboardMode {
  if (type === 'email' || autoComplete === 'email') {
    return 'email'
  }

  if (isPhoneField({ type, inputMode, autoComplete, name, id })) {
    return 'tel'
  }

  if (type === 'number' || inputMode === 'numeric') {
    return 'numeric'
  }

  if (inputMode === 'decimal') {
    return 'decimal'
  }

  if (multiline) {
    return 'text'
  }

  return 'text'
}

function isPhoneField({
  type,
  inputMode,
  autoComplete,
  name,
  id,
}: {
  type?: string
  inputMode?: string
  autoComplete?: string
  name?: string
  id?: string
}) {
  if (type === 'tel' || inputMode === 'tel') return true
  if (autoComplete?.startsWith('tel')) return true

  const hint = `${name ?? ''} ${id ?? ''}`.toLowerCase()
  return /\b(phone|tel|mobile|fax)\b/.test(hint)
}

const TEL_CHARS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '(', ')', '-', ' '])

export function appendKeyboardChar(
  current: string,
  char: string,
  mode: MobileKeyboardMode,
  caretIndex = current.length
) {
  if (mode === 'tel' && !TEL_CHARS.has(char)) {
    return { value: current, caretIndex }
  }

  if (char === '.' && mode === 'decimal') {
    if (current.includes('.')) return { value: current, caretIndex }
    if (!current) {
      return { value: '0.', caretIndex: 2 }
    }
    const index = Math.max(0, Math.min(current.length, caretIndex))
    return {
      value: `${current.slice(0, index)}.${current.slice(index)}`,
      caretIndex: index + 1,
    }
  }

  if (mode === 'numeric' || mode === 'decimal') {
    if (char === '.' && mode === 'numeric') {
      return { value: current, caretIndex }
    }
    if (char === '0' && current === '0' && !current.includes('.')) {
      return { value: current, caretIndex }
    }
  }

  const index = Math.max(0, Math.min(current.length, caretIndex))
  return {
    value: `${current.slice(0, index)}${char}${current.slice(index)}`,
    caretIndex: index + char.length,
  }
}

export function backspaceKeyboardValue(
  current: string,
  caretIndex = current.length
) {
  const index = Math.max(0, Math.min(current.length, caretIndex))
  if (index <= 0) {
    return { value: current, caretIndex: 0 }
  }

  return {
    value: `${current.slice(0, index - 1)}${current.slice(index)}`,
    caretIndex: index - 1,
  }
}
