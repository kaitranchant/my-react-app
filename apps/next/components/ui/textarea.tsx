'use client'

import * as React from 'react'

import { useMobileKeyboard } from '@/components/mobile-keyboard/mobile-keyboard-context'
import { useMobileKeyboardField } from '@/components/mobile-keyboard/use-mobile-keyboard-field'
import { cn } from '@/lib/utils'

type TextareaProps = Omit<React.ComponentProps<'textarea'>, 'data-native-keyboard'> & {
  nativeKeyboard?: boolean
  'data-native-keyboard'?: boolean | string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      className,
      disabled,
      readOnly,
      nativeKeyboard,
      value,
      defaultValue,
      placeholder,
      onChange,
      name,
      id,
      rows,
      'data-native-keyboard': dataNativeKeyboard,
      ...props
    },
    ref
  ) {
    const keyboard = useMobileKeyboard()
    const nativeTextareaRef = React.useRef<HTMLTextAreaElement>(null)

    const field = useMobileKeyboardField({
      kind: 'textarea',
      disabled,
      readOnly,
      nativeKeyboard,
      value,
      defaultValue,
      placeholder,
      onTextareaChange: onChange,
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
          form: nativeTextareaRef.current?.form ?? null,
        } as unknown as HTMLTextAreaElement
      }
      return nativeTextareaRef.current as HTMLTextAreaElement
    })

    if (!field.useCustomKeyboard) {
      return (
        <textarea
          ref={nativeTextareaRef}
          data-slot="textarea"
          className={cn(
            'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-lg border bg-transparent px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            className
          )}
          disabled={disabled}
          readOnly={readOnly}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          onChange={onChange}
          name={name}
          id={id}
          rows={rows}
          {...props}
        />
      )
    }

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
          data-slot="textarea"
          data-mobile-field={field.fieldId}
          aria-label={placeholder || props['aria-label'] || 'Text area'}
          aria-selected={field.isActive || undefined}
          {...field.tapHandlers}
          className={cn(
            field.fauxFieldClassName,
            'touch-pan-y flex min-h-16 items-start text-left',
            disabled && 'pointer-events-none opacity-50'
          )}
          style={
            rows
              ? { minHeight: `calc(${rows} * 1.5rem + 1rem)` }
              : undefined
          }
        >
          <span
            className={cn(
              'block w-full whitespace-pre-wrap break-words',
              !field.currentValue && 'text-muted-foreground'
            )}
          >
            {field.displayValue}
          </span>
        </button>
      </>
    )
  }
)

export { Textarea }
