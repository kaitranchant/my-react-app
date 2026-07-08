'use client'

import * as React from 'react'

import {
  appendKeyboardChar,
  backspaceKeyboardValue,
  type MobileKeyboardMode,
} from '@/lib/mobile-keyboard/resolve-keyboard-mode'
import { dismissFloatingLayers } from '@/lib/mobile-keyboard/dismiss-floating-layers'
import {
  NESTED_KEYBOARD_SCROLL_SELECTOR,
  scrollElementIntoMainContent,
  scrollFocusedInputIntoView,
} from '@/lib/visual-viewport/app-viewport'

export type MobileKeyboardFieldKind = 'input' | 'textarea'

export type ActiveMobileField = {
  id: string
  kind: MobileKeyboardFieldKind
  mode: MobileKeyboardMode
  multiline: boolean
}

export type MobileFieldRegistration = {
  id: string
  kind: MobileKeyboardFieldKind
  mode: MobileKeyboardMode
  multiline: boolean
  getValue: () => string
  setValue: (value: string) => void
  getElement: () => HTMLElement | null
  onDone?: () => void
}

type MobileKeyboardContextValue = {
  enabled: boolean
  activeField: ActiveMobileField | null
  /** Live value for the active field; updates on every keypress. */
  activeValue: string
  openField: (id: string, element?: HTMLElement | null) => void
  closeKeyboard: () => void
  isFieldActive: (id: string) => boolean
  registerField: (registration: MobileFieldRegistration) => void
  unregisterField: (id: string) => void
  appendChar: (char: string) => void
  backspace: () => void
  getActiveValue: () => string
  keypadReserveHeight: number
  setKeypadReserveHeight: (height: number) => void
}

const MobileKeyboardContext =
  React.createContext<MobileKeyboardContextValue | null>(null)

export function useMobileKeyboard() {
  return React.useContext(MobileKeyboardContext)
}

export function useMobileKeyboardOptional() {
  return React.useContext(MobileKeyboardContext)
}

type MobileKeyboardProviderProps = {
  enabled: boolean
  children: React.ReactNode
}

export function MobileKeyboardProvider({
  enabled,
  children,
}: MobileKeyboardProviderProps) {
  const [activeField, setActiveField] =
    React.useState<ActiveMobileField | null>(null)
  const [editingValue, setEditingValue] = React.useState('')
  const [keypadReserveHeight, setKeypadReserveHeight] = React.useState(0)
  const fieldsRef = React.useRef(new Map<string, MobileFieldRegistration>())

  const scrollFieldIntoView = React.useCallback(
    (element?: HTMLElement | null) => {
      if (!element) return

      const nestedScroll = element.closest(NESTED_KEYBOARD_SCROLL_SELECTOR)
      if (nestedScroll instanceof HTMLElement) {
        scrollFocusedInputIntoView(element, nestedScroll, { paddingPx: 24 })
        return
      }

      const main = document.getElementById('main-content')
      if (main && main.contains(element)) {
        scrollFocusedInputIntoView(element, main)
        return
      }

      scrollElementIntoMainContent(element, {
        behavior: 'smooth',
        block: 'center',
      })
    },
    []
  )

  const scrollActiveFieldIntoView = React.useCallback(() => {
    if (!activeField) return
    const registration = fieldsRef.current.get(activeField.id)
    scrollFieldIntoView(registration?.getElement() ?? null)
  }, [activeField, scrollFieldIntoView])

  const openField = React.useCallback(
    (id: string, element?: HTMLElement | null) => {
      if (!enabled) return

      const registration = fieldsRef.current.get(id)
      if (!registration) return

      dismissFloatingLayers()

      setEditingValue(registration.getValue())
      setActiveField({
        id,
        kind: registration.kind,
        mode: registration.mode,
        multiline: registration.multiline,
      })

      const target = element ?? registration.getElement()
      if (target) {
        requestAnimationFrame(() => scrollFieldIntoView(target))
      }
    },
    [enabled, scrollFieldIntoView]
  )

  const closeKeyboard = React.useCallback(() => {
    const activeId = activeField?.id
    if (activeId) {
      const registration = fieldsRef.current.get(activeId)
      registration?.onDone?.()
    }
    setActiveField(null)
  }, [activeField?.id])

  const isFieldActive = React.useCallback(
    (id: string) => activeField?.id === id,
    [activeField?.id]
  )

  const registerField = React.useCallback(
    (registration: MobileFieldRegistration) => {
      fieldsRef.current.set(registration.id, registration)
    },
    []
  )

  const unregisterField = React.useCallback((id: string) => {
    fieldsRef.current.delete(id)
    setActiveField((current) => (current?.id === id ? null : current))
  }, [])

  const getActiveValue = React.useCallback(() => editingValue, [editingValue])

  const patchActiveValue = React.useCallback(
    (value: string) => {
      if (!activeField) return
      const registration = fieldsRef.current.get(activeField.id)
      if (!registration) return
      setEditingValue(value)
      registration.setValue(value)
      requestAnimationFrame(() => scrollFieldIntoView(registration.getElement()))
    },
    [activeField, scrollFieldIntoView]
  )

  React.useEffect(() => {
    if (!activeField || keypadReserveHeight <= 0) return
    requestAnimationFrame(() => scrollActiveFieldIntoView())
  }, [activeField, keypadReserveHeight, scrollActiveFieldIntoView])

  const appendChar = React.useCallback(
    (char: string) => {
      if (!activeField) return
      patchActiveValue(
        appendKeyboardChar(getActiveValue(), char, activeField.mode)
      )
    },
    [activeField, getActiveValue, patchActiveValue]
  )

  const backspace = React.useCallback(() => {
    patchActiveValue(backspaceKeyboardValue(getActiveValue()))
  }, [getActiveValue, patchActiveValue])

  const value = React.useMemo<MobileKeyboardContextValue>(
    () => ({
      enabled,
      activeField,
      activeValue: editingValue,
      openField,
      closeKeyboard,
      isFieldActive,
      registerField,
      unregisterField,
      appendChar,
      backspace,
      getActiveValue,
      keypadReserveHeight,
      setKeypadReserveHeight,
    }),
    [
      enabled,
      activeField,
      editingValue,
      openField,
      closeKeyboard,
      isFieldActive,
      registerField,
      unregisterField,
      appendChar,
      backspace,
      getActiveValue,
      keypadReserveHeight,
    ]
  )

  return (
    <MobileKeyboardContext.Provider value={value}>
      {children}
    </MobileKeyboardContext.Provider>
  )
}

let nextFieldId = 0

export function createMobileFieldId() {
  nextFieldId += 1
  return `mobile-field-${nextFieldId}`
}
