'use client'

import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTouchFirstLayout } from '@/lib/hooks/use-touch-first-layout'
import { pinScrollContainersAround } from '@/lib/visual-viewport/app-viewport'
import { cn } from '@/lib/utils'

export const KEYBOARD_OVERLAY_ROOT_ATTR = 'data-keyboard-overlay-root'
export const KEYBOARD_OVERLAY_EXEMPT_ATTR = 'data-keyboard-overlay-exempt'

/** Typical phone keyboard height. Overlay only if the field sits in this band. */
const KEYBOARD_COVER_PX = 320

let cachedLayoutHeight = 0

function rememberLayoutViewportHeight() {
  const visualViewport = window.visualViewport
  const keyboardLikelyOpen =
    visualViewport != null &&
    visualViewport.height < window.innerHeight - 120

  const layoutHeight = Math.max(
    window.innerHeight,
    document.documentElement.clientHeight,
    visualViewport ? visualViewport.height + visualViewport.offsetTop : 0
  )

  if (!keyboardLikelyOpen) {
    cachedLayoutHeight = Math.max(cachedLayoutHeight, layoutHeight)
  }

  return Math.max(cachedLayoutHeight, layoutHeight)
}

const UNSUPPORTED_INPUT_TYPES = new Set([
  'hidden',
  'file',
  'checkbox',
  'radio',
  'range',
  'color',
  'date',
  'time',
  'datetime-local',
  'month',
  'week',
  'button',
  'submit',
  'reset',
  'image',
])

type OverlayField = {
  source: HTMLInputElement | HTMLTextAreaElement
  multiline: boolean
  type: string
  inputMode: React.HTMLAttributes<HTMLElement>['inputMode']
  enterKeyHint: React.HTMLAttributes<HTMLElement>['enterKeyHint']
  autoComplete: string
  maxLength: number
  placeholder: string
  ariaLabel: string
  value: string
}

function isEditableTextField(
  element: Element
): element is HTMLInputElement | HTMLTextAreaElement {
  if (element instanceof HTMLTextAreaElement) return true
  if (!(element instanceof HTMLInputElement)) return false
  return !UNSUPPORTED_INPUT_TYPES.has(element.type)
}

function isExemptOrInsideOverlay(element: Element) {
  return (
    element.closest(`[${KEYBOARD_OVERLAY_ROOT_ATTR}]`) != null ||
    element.closest(`[${KEYBOARD_OVERLAY_EXEMPT_ATTR}]`) != null
  )
}

function wouldBeCoveredByKeyboard(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  const layoutHeight = rememberLayoutViewportHeight()
  const coverBand = Math.min(
    KEYBOARD_COVER_PX,
    Math.round(layoutHeight * 0.38)
  )
  return rect.bottom > layoutHeight - coverBand
}

function snapshotField(
  source: HTMLInputElement | HTMLTextAreaElement
): OverlayField {
  const ariaLabel =
    source.getAttribute('aria-label') || source.placeholder || 'Text field'

  return {
    source,
    multiline: source instanceof HTMLTextAreaElement,
    type: source instanceof HTMLInputElement ? source.type || 'text' : 'text',
    inputMode:
      (source.inputMode as OverlayField['inputMode']) || undefined,
    enterKeyHint:
      (source.enterKeyHint as OverlayField['enterKeyHint']) || undefined,
    autoComplete: source.autocomplete ?? '',
    maxLength: source.maxLength > 0 ? source.maxLength : -1,
    placeholder: source.placeholder ?? '',
    ariaLabel,
    value: source.value,
  }
}

function assignNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  nextValue: string
) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  descriptor?.set?.call(element, nextValue)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

function shouldOpenOverlay(element: HTMLInputElement | HTMLTextAreaElement) {
  if (element.disabled || element.readOnly) return false
  if (isExemptOrInsideOverlay(element)) return false
  if (!document.contains(element)) return false
  return wouldBeCoveredByKeyboard(element)
}

export function KeyboardInputOverlayProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const enabled = useTouchFirstLayout()
  const [field, setField] = React.useState<OverlayField | null>(null)
  const overlayFieldRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(
    null
  )

  const closeOverlay = React.useCallback(() => {
    setField(null)
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      setField(null)
      return
    }

    rememberLayoutViewportHeight()
    window.addEventListener('resize', rememberLayoutViewportHeight)
    window.visualViewport?.addEventListener(
      'resize',
      rememberLayoutViewportHeight
    )

    const openFromElement = (element: Element | null) => {
      if (!element || !isEditableTextField(element)) return
      if (!shouldOpenOverlay(element)) return

      pinScrollContainersAround(element)
      setField((current) => {
        if (current?.source === element) return current
        return snapshotField(element)
      })
    }

    const interceptOriginalFocus = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!isEditableTextField(target)) return
      if (!shouldOpenOverlay(target)) return

      event.preventDefault()
      openFromElement(target)
    }

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      openFromElement(target)
    }

    // iOS ignores pointerdown preventDefault for focusing inputs; touchstart
    // must be non-passive so the original field never receives focus.
    document.addEventListener('touchstart', interceptOriginalFocus, {
      capture: true,
      passive: false,
    })
    document.addEventListener('pointerdown', interceptOriginalFocus, true)
    document.addEventListener('focusin', onFocusIn, true)

    return () => {
      window.removeEventListener('resize', rememberLayoutViewportHeight)
      window.visualViewport?.removeEventListener(
        'resize',
        rememberLayoutViewportHeight
      )
      document.removeEventListener(
        'touchstart',
        interceptOriginalFocus,
        true
      )
      document.removeEventListener('pointerdown', interceptOriginalFocus, true)
      document.removeEventListener('focusin', onFocusIn, true)
    }
  }, [enabled])

  React.useEffect(() => {
    if (!field) return

    const source = field.source
    const observer = new MutationObserver(() => {
      if (document.contains(source)) return
      requestAnimationFrame(() => {
        if (
          document.activeElement instanceof Element &&
          document.activeElement.closest('[data-keyboard-overlay-root]')
        ) {
          return
        }
        if (!document.contains(source)) closeOverlay()
      })
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [field, closeOverlay])

  const handleValueChange = (nextValue: string) => {
    if (!field) return
    if (document.contains(field.source)) {
      assignNativeValue(field.source, nextValue)
    }
    setField((current) => (current ? { ...current, value: nextValue } : current))
  }

  const handleOverlayKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key !== 'Enter' || field?.multiline) return
    event.preventDefault()
    if (field && document.contains(field.source)) {
      field.source.dispatchEvent(new Event('change', { bubbles: true }))
    }
    closeOverlay()
  }

  const fieldClassName = cn(
    'placeholder:text-muted-foreground flex w-full rounded-md bg-transparent py-3 text-base outline-none md:text-sm',
    field?.multiline ? 'min-h-24 resize-none' : 'h-10'
  )

  return (
    <>
      {children}
      <Dialog
        open={field != null}
        onOpenChange={(open) => {
          if (!open) closeOverlay()
        }}
      >
        <DialogContent
          data-keyboard-overlay-root=""
          className="z-[60] overflow-hidden p-0 sm:max-w-lg"
          overlayClassName="z-[60]"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            overlayFieldRef.current?.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
          }}
          onFocusOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            const target = event.target
            if (
              target instanceof Element &&
              target.closest('[data-slot="dialog-overlay"]')
            ) {
              return
            }
            event.preventDefault()
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Edit text</DialogTitle>
            <DialogDescription>
              Type here so the keyboard does not cover the field.
            </DialogDescription>
          </DialogHeader>
          <div
            className={cn(
              'flex gap-2 px-3 pr-12',
              field?.multiline ? 'items-start border-b py-2' : 'h-12 items-center border-b'
            )}
          >
            {field?.multiline ? (
              <textarea
                ref={overlayFieldRef as React.RefObject<HTMLTextAreaElement>}
                data-slot="keyboard-overlay-field"
                className={fieldClassName}
                value={field.value}
                placeholder={field.placeholder}
                aria-label={field.ariaLabel}
                inputMode={field.inputMode}
                enterKeyHint={field.enterKeyHint ?? 'enter'}
                autoComplete={field.autoComplete || undefined}
                maxLength={field.maxLength > 0 ? field.maxLength : undefined}
                onChange={(event) => handleValueChange(event.target.value)}
                onKeyDown={handleOverlayKeyDown}
              />
            ) : (
              <input
                ref={overlayFieldRef as React.RefObject<HTMLInputElement>}
                data-slot="keyboard-overlay-field"
                className={fieldClassName}
                type={field?.type || 'text'}
                value={field?.value ?? ''}
                placeholder={field?.placeholder}
                aria-label={field?.ariaLabel}
                inputMode={field?.inputMode}
                enterKeyHint={field?.enterKeyHint ?? 'done'}
                autoComplete={field?.autoComplete || undefined}
                maxLength={
                  field && field.maxLength > 0 ? field.maxLength : undefined
                }
                onChange={(event) => handleValueChange(event.target.value)}
                onKeyDown={handleOverlayKeyDown}
              />
            )}
          </div>
          {field?.multiline ? (
            <div className="flex justify-end px-3 py-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (field && document.contains(field.source)) {
                    field.source.dispatchEvent(
                      new Event('change', { bubbles: true })
                    )
                  }
                  closeOverlay()
                }}
              >
                Done
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
