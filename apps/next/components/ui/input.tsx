'use client'

import * as React from 'react'

import { MobileKeyboardEditableText } from '@/components/mobile-keyboard/mobile-keyboard-editable-text'
import { useMobileKeyboard } from '@/components/mobile-keyboard/mobile-keyboard-context'
import { useMobileKeyboardField } from '@/components/mobile-keyboard/use-mobile-keyboard-field'
import { cn } from '@/lib/utils'

type InputProps = Omit<React.ComponentProps<'input'>, 'data-native-keyboard'> & {
  nativeKeyboard?: boolean
  'data-native-keyboard'?: boolean | string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    type,
    inputMode,
    autoComplete,
    disabled,
    readOnly,
    nativeKeyboard,
    value,
    defaultValue,
    placeholder,
    onChange,
    name,
    id,
    'data-native-keyboard': dataNativeKeyboard,
    ...props
  },
  ref
) {
  const keyboard = useMobileKeyboard()
  const nativeInputRef = React.useRef<HTMLInputElement>(null)

  const field = useMobileKeyboardField({
    kind: 'input',
    type,
    inputMode,
    autoComplete,
    name,
    id,
    disabled,
    readOnly,
    nativeKeyboard,
    value,
    defaultValue,
    placeholder,
    onChange,
    className,
    dataNativeKeyboard: dataNativeKeyboard,
  })

  React.useImperativeHandle(ref, () => {
    if (field.useCustomKeyboard) {
      return {
        focus: () => field.openKeyboard(),
        blur: () => keyboard?.closeKeyboard(),
        select: () => {},
        setSelectionRange: () => {},
        value: field.currentValue,
        name: name ?? '',
        type: type ?? 'text',
        form: nativeInputRef.current?.form ?? null,
      } as unknown as HTMLInputElement
    }
    return nativeInputRef.current as HTMLInputElement
  })

  if (!field.useCustomKeyboard) {
    return (
      <input
        ref={nativeInputRef}
        type={type}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground border-input bg-background flex h-10 w-full min-w-0 rounded-lg border px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 aria-invalid:border-destructive',
          className
        )}
        inputMode={inputMode}
        autoComplete={autoComplete}
        disabled={disabled}
        readOnly={readOnly}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={onChange}
        name={name}
        id={id}
        {...props}
      />
    )
  }

  const caretIndex =
    field.isActive && keyboard ? keyboard.caretIndex : field.currentValue.length

  return (
    <>
      {name ? (
        <input
          ref={field.hiddenInputRef}
          type="hidden"
          name={name}
          value={field.currentValue}
          tabIndex={-1}
          aria-hidden
          readOnly
        />
      ) : null}
      <button
        ref={field.elementRef}
        type="button"
        id={id}
        disabled={disabled}
        data-slot="input"
        data-mobile-field={field.fieldId}
        aria-label={placeholder || props['aria-label'] || 'Input field'}
        aria-selected={field.isActive || undefined}
        {...field.tapHandlers}
        className={cn(
          field.fauxFieldClassName,
          'touch-pan-y text-left',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <MobileKeyboardEditableText
          value={field.currentValue}
          caretIndex={caretIndex}
          placeholder={placeholder}
          isActive={Boolean(field.isActive)}
          onPlaceCaret={(index) => {
            if (!field.isActive) {
              field.openKeyboard()
            }
            keyboard?.setCaretIndex(index)
          }}
        />
      </button>
    </>
  )
})

export { Input }
