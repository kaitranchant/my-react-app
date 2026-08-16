'use client'

const VIEWPORT_CSS_VARS = {
  top: '--app-vv-top',
  left: '--app-vv-left',
  width: '--app-vv-width',
  height: '--app-vv-height',
} as const

const KEYBOARD_OPEN_HEIGHT_DELTA_PX = 120

/** Marks a nested scroll container that manages its own keyboard scroll. */
export const NESTED_KEYBOARD_SCROLL_SELECTOR = '[data-nested-keyboard-scroll]'

export function isInNestedKeyboardScrollContainer() {
  return (
    document.activeElement instanceof Element &&
    document.activeElement.closest(NESTED_KEYBOARD_SCROLL_SELECTOR) != null
  )
}

export function isKeyboardOpen() {
  if (typeof document !== 'undefined') {
    if (document.documentElement.hasAttribute('data-mobile-keyboard-open')) {
      return false
    }
  }

  const visualViewport = window.visualViewport
  if (!visualViewport) return false

  const active = document.activeElement
  const hasFocusedEditable =
    active instanceof HTMLElement &&
    (active.isContentEditable ||
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT')

  if (!hasFocusedEditable) return false

  return visualViewport.height < window.innerHeight - KEYBOARD_OPEN_HEIGHT_DELTA_PX
}

function isFixedAppShellLayout() {
  return document.querySelector('[data-app-shell]') != null
}

export function resetWindowScroll() {
  if (!isFixedAppShellLayout()) return

  // `html { scroll-behavior: smooth }` would animate this reset, which looks
  // like the keyboard jump sliding back down. Force an instant pin.
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

type ScrollPin = { el: HTMLElement; top: number; left: number }

let scrollPins: ScrollPin[] = []
let pinGeneration = 0
let pinUntil = 0

const KEYBOARD_SCROLL_PIN_MS = 500

function isVerticallyScrollable(el: HTMLElement) {
  const style = getComputedStyle(el)
  const overflowY = style.overflowY
  const canScroll =
    overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
  return canScroll && el.scrollHeight > el.clientHeight + 1
}

function collectScrollPins(target: EventTarget | null): ScrollPin[] {
  const pins: ScrollPin[] = []
  const seen = new Set<HTMLElement>()
  const add = (el: HTMLElement | null) => {
    if (!el || seen.has(el)) return
    seen.add(el)
    pins.push({ el, top: el.scrollTop, left: el.scrollLeft })
  }

  let current = target instanceof Element ? target.parentElement : null
  while (current instanceof HTMLElement) {
    if (current.id === 'main-content' || isVerticallyScrollable(current)) {
      add(current)
    }
    current = current.parentElement
  }

  add(document.getElementById('main-content'))
  return pins
}

function restorePinnedScrolls() {
  if (scrollPins.length === 0) return false
  if (performance.now() > pinUntil) {
    scrollPins = []
    return false
  }

  resetWindowScroll()
  for (const pin of scrollPins) {
    if (pin.el.scrollTop !== pin.top) pin.el.scrollTop = pin.top
    if (pin.el.scrollLeft !== pin.left) pin.el.scrollLeft = pin.left
  }
  return true
}

/** Snapshot scroll parents before iOS autoscrolls the focused field. */
export function pinScrollContainersAround(target: EventTarget | null) {
  const now = performance.now()
  if (scrollPins.length > 0 && now < pinUntil) {
    pinUntil = now + KEYBOARD_SCROLL_PIN_MS
    return
  }

  scrollPins = collectScrollPins(target)
  pinUntil = now + KEYBOARD_SCROLL_PIN_MS
  const generation = ++pinGeneration

  const tick = () => {
    if (generation !== pinGeneration) return
    restorePinnedScrolls()
    if (performance.now() < pinUntil) {
      requestAnimationFrame(tick)
    }
  }

  restorePinnedScrolls()
  requestAnimationFrame(tick)
}

export function clampMainContentScroll() {
  const main = document.getElementById('main-content')
  if (!main) return

  const maxScroll = Math.max(0, main.scrollHeight - main.clientHeight)
  if (main.scrollTop > maxScroll) {
    main.scrollTop = maxScroll
  }
}

/** Scroll within #main-content instead of the document (fixed app shell). */
export function scrollElementIntoMainContent(
  element: HTMLElement,
  options: { behavior?: ScrollBehavior; block?: 'start' | 'center' | 'end' } = {}
) {
  const main = document.getElementById('main-content')
  const { behavior = 'smooth', block = 'start' } = options

  if (!main) {
    element.scrollIntoView({ behavior, block })
    return
  }

  resetWindowScroll()

  const scrollMarginTop =
    Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 0
  const mainRect = main.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const relativeTop =
    elementRect.top - mainRect.top + main.scrollTop - scrollMarginTop

  let targetScroll: number
  switch (block) {
    case 'center':
      targetScroll =
        relativeTop - (main.clientHeight - elementRect.height) / 2
      break
    case 'end':
      targetScroll = relativeTop - main.clientHeight + elementRect.height
      break
    default:
      targetScroll = relativeTop
  }

  const maxScroll = Math.max(0, main.scrollHeight - main.clientHeight)
  main.scrollTo({
    top: Math.min(Math.max(0, targetScroll), maxScroll),
    behavior,
  })
  clampMainContentScroll()
}

export function syncAppViewportCssVars() {
  const root = document.documentElement
  root.style.setProperty(VIEWPORT_CSS_VARS.top, '0px')
  root.style.setProperty(VIEWPORT_CSS_VARS.left, '0px')
  root.style.setProperty(VIEWPORT_CSS_VARS.width, '100%')
  root.style.setProperty(VIEWPORT_CSS_VARS.height, '100svh')
}

export function stabilizeViewportScroll() {
  syncAppViewportCssVars()
  resetWindowScroll()
  clampMainContentScroll()
}

export function burstStabilizeViewportScroll(durationMs = 500) {
  const startedAt = performance.now()

  const tick = () => {
    stabilizeViewportScroll()
    if (performance.now() - startedAt < durationMs) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}

export function installAppViewportSync() {
  const visualViewport = window.visualViewport
  const main = document.getElementById('main-content')
  let keyboardWasOpen = isKeyboardOpen()

  const onViewportChange = (event: Event) => {
    const keyboardOpen = isKeyboardOpen()
    const appShell = isFixedAppShellLayout()

    if (scrollPins.length > 0 && keyboardOpen) {
      pinUntil = Math.max(pinUntil, performance.now() + 180)
    }

    if (restorePinnedScrolls()) {
      keyboardWasOpen = keyboardOpen
      return
    }

    if (event.type === 'scroll') {
      if (appShell) resetWindowScroll()
      return
    }

    syncAppViewportCssVars()
    if (appShell) resetWindowScroll()

    if (appShell && keyboardWasOpen && !keyboardOpen) {
      clampMainContentScroll()
      burstStabilizeViewportScroll(400)
    }

    keyboardWasOpen = keyboardOpen
  }

  const onWindowScroll = () => {
    if (!isFixedAppShellLayout()) return
    if (restorePinnedScrolls()) return
    resetWindowScroll()
    clampMainContentScroll()
  }

  const onMainScroll = () => {
    if (restorePinnedScrolls()) return
    clampMainContentScroll()
  }

  const onPrepareEditableFocus = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    if (
      !target.closest(
        'input, textarea, select, [contenteditable="true"]'
      )
    ) {
      return
    }
    pinScrollContainersAround(target)
  }

  const onFocusIn = (event: FocusEvent) => {
    const target = event.target
    if (!(target instanceof Node) || !main?.contains(target)) return

    pinScrollContainersAround(target)

    const inNestedKeyboardScroll =
      target instanceof Element &&
      target.closest(NESTED_KEYBOARD_SCROLL_SELECTOR)

    requestAnimationFrame(() => {
      if (!isFixedAppShellLayout()) return
      if (restorePinnedScrolls()) return
      resetWindowScroll()
      if (!inNestedKeyboardScroll) {
        clampMainContentScroll()
      }
    })
  }

  stabilizeViewportScroll()
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  window.addEventListener('touchstart', onPrepareEditableFocus, {
    capture: true,
    passive: true,
  })
  window.addEventListener('pointerdown', onPrepareEditableFocus, {
    capture: true,
  })
  main?.addEventListener('scroll', onMainScroll, { passive: true })
  main?.addEventListener('focusin', onFocusIn)
  visualViewport?.addEventListener('resize', onViewportChange)
  visualViewport?.addEventListener('scroll', onViewportChange)

  return () => {
    pinGeneration += 1
    scrollPins = []
    window.removeEventListener('scroll', onWindowScroll)
    window.removeEventListener('touchstart', onPrepareEditableFocus, true)
    window.removeEventListener('pointerdown', onPrepareEditableFocus, true)
    main?.removeEventListener('scroll', onMainScroll)
    main?.removeEventListener('focusin', onFocusIn)
    visualViewport?.removeEventListener('resize', onViewportChange)
    visualViewport?.removeEventListener('scroll', onViewportChange)

    const root = document.documentElement
    root.style.removeProperty(VIEWPORT_CSS_VARS.top)
    root.style.removeProperty(VIEWPORT_CSS_VARS.left)
    root.style.removeProperty(VIEWPORT_CSS_VARS.width)
    root.style.removeProperty(VIEWPORT_CSS_VARS.height)
  }
}
