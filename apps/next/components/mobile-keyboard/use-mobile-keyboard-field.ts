'use client'

import * as React from 'react'

import {
  createMobileFieldId,
  useMobileKeyboard,
} from '@/components/mobile-keyboard/mobile-keyboard-context'
import { useTapToOpen } from '@/components/mobile-keyboard/use-tap-to-open'
import { usePreferMobileKeyboard } from '@/lib/hooks/use-prefer-mobile-keyboard'
import {
  resolveKeyboardMode,
  shouldUseNativeKeyboardType,
} from '@/lib/mobile-keyboard/resolve-keyboard-mode'
import { cn } from '@/lib/utils'

type UseMobileKeyboardFieldOptions = {
  kind: 'input' | 'textarea'
  type?: string
  inputMode?: string
  autoComplete?: string
  disabled?: boolean
  readOnly?: boolean
  nativeKeyboard?: boolean
  value?: string | number | readonly string[]
  defaultValue?: string | number | readonly string[]
  placeholder?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onTextareaChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onDone?: () => void
  className?: string
  dataNativeKeyboard?: boolean | string
}

function toStringValue(
  value: string | number | readonly string[] | undefined
): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.join('')
  return String(value)
}

function createSyntheticChangeEvent<T extends HTMLInputElement | HTMLTextAreaElement>(
  target: T,
  value: string
): React.ChangeEvent<T> {
  return {
    target: { ...target, value } as T,
    currentTarget: { ...target, value } as T,
  } as React.ChangeEvent<T>
}

export function useMobileKeyboardField({
  kind,
  type,
  inputMode,
  autoComplete,
  disabled = false,
  readOnly = false,
  nativeKeyboard = false,
  value,
  defaultValue,
  placeholder,
  onChange,
  onTextareaChange,
  onDone,
  className,
  dataNativeKeyboard,
}: UseMobileKeyboardFieldOptions) {
  const preferMobileKeyboard = usePreferMobileKeyboard()
  const keyboard = useMobileKeyboard()
  const fieldIdRef = React.useRef<string | null>(null)
  if (!fieldIdRef.current) {
    fieldIdRef.current = createMobileFieldId()
  }
  const fieldId = fieldIdRef.current

  const elementRef = React.useRef<HTMLButtonElement>(null)
  const hiddenInputRef = React.useRef<HTMLInputElement>(null)
  const isControlled = value !== undefined

  const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
    toStringValue(defaultValue)
  )

  const currentValue = isControlled ? toStringValue(value) : uncontrolledValue
  const currentValueRef = React.useRef(currentValue)
  currentValueRef.current = currentValue

  const mode = resolveKeyboardMode({
    type,
    inputMode,
    autoComplete,
    multiline: kind === 'textarea',
  })

  const optedOut =
    nativeKeyboard ||
    dataNativeKeyboard != null ||
    disabled ||
    readOnly ||
    shouldUseNativeKeyboardType(type)

  const useCustomKeyboard = Boolean(
    preferMobileKeyboard && keyboard?.enabled && !optedOut
  )

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }

      if (kind === 'textarea') {
        onTextareaChange?.(
          createSyntheticChangeEvent(
            { value: nextValue } as HTMLTextAreaElement,
            nextValue
          )
        )
      } else {
        onChange?.(
          createSyntheticChangeEvent(
            { value: nextValue } as HTMLInputElement,
            nextValue
          )
        )
      }

      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = nextValue
      }
    },
    [isControlled, kind, onChange, onTextareaChange]
  )

  React.useEffect(() => {
    if (!useCustomKeyboard || !keyboard) return

    keyboard.registerField({
      id: fieldId,
      kind,
      mode,
      multiline: kind === 'textarea',
      getValue: () => currentValueRef.current,
      setValue,
      getElement: () => elementRef.current,
      onDone,
    })

    return () => keyboard.unregisterField(fieldId)
  }, [fieldId, keyboard, kind, mode, onDone, setValue, useCustomKeyboard])

  const openKeyboard = React.useCallback(() => {
    if (!useCustomKeyboard || !keyboard) return
    keyboard.openField(fieldId, elementRef.current)
  }, [fieldId, keyboard, useCustomKeyboard])

  const tapHandlers = useTapToOpen(openKeyboard, !useCustomKeyboard)

  const imperativeRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      elementRef.current = node
    },
    []
  )

  const isActive = useCustomKeyboard && keyboard?.isFieldActive(fieldId)

  const fauxFieldClassName = cn(
    kind === 'input'
      ? 'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input bg-background flex h-10 w-full min-w-0 rounded-lg border px-3 py-1 text-base transition-[color,box-shadow] outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
      : 'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex field-sizing-content min-h-16 w-full rounded-lg border bg-transparent px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] md:text-sm',
    isActive && 'border-brand ring-brand/40 ring-2',
    !currentValue && 'text-muted-foreground',
    kind === 'textarea' && 'items-start whitespace-pre-wrap text-left',
    className
  )

  return {
    useCustomKeyboard,
    fieldId,
    elementRef,
    hiddenInputRef,
    imperativeRef,
    tapHandlers,
    openKeyboard,
    isActive,
    currentValue,
    fauxFieldClassName,
    displayValue: currentValue || placeholder || '',
    mode,
  }
}
