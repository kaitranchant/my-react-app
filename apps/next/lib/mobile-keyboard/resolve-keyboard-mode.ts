export type MobileKeyboardMode = 'text' | 'numeric' | 'decimal' | 'email'

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
}: {
  type?: string
  inputMode?: string
  autoComplete?: string
  multiline?: boolean
}): MobileKeyboardMode {
  if (type === 'email' || autoComplete === 'email') {
    return 'email'
  }

  if (
    type === 'number' ||
    inputMode === 'numeric' ||
    inputMode === 'tel'
  ) {
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

export function appendKeyboardChar(
  current: string,
  char: string,
  mode: MobileKeyboardMode
) {
  if (char === '.' && mode === 'decimal') {
    if (current.includes('.')) return current
    return current ? `${current}.` : '0.'
  }

  if (mode === 'numeric' || mode === 'decimal') {
    if (char === '.' && mode === 'numeric') return current
    if (char === '0' && current === '0' && !current.includes('.')) {
      return current
    }
  }

  return `${current}${char}`
}

export function backspaceKeyboardValue(current: string) {
  return current.slice(0, -1)
}
