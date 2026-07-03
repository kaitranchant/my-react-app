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

export function isManagingNestedKeyboardScroll() {
  return isInNestedKeyboardScrollContainer() && isKeyboardOpen()
}

export function isKeyboardOpen() {
  if (typeof document !== 'undefined') {
    if (document.documentElement.hasAttribute('data-mobile-keyboard-open')) {
      return false
    }
  }

  const visualViewport = window.visualViewport
  if (!visualViewport) return false
  return visualViewport.height < window.innerHeight - KEYBOARD_OPEN_HEIGHT_DELTA_PX
}

function isFixedAppShellLayout() {
  return document.querySelector('[data-app-shell]') != null
}

export function resetWindowScroll() {
  if (!isFixedAppShellLayout()) return

  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
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

/**
 * Keep a focused input visible within a nested scroll container.
 * Uses the scroll parent's visible bounds (already sized by the app shell keyboard sync).
 */
export function scrollFocusedInputIntoView(
  element: HTMLElement,
  scrollParent: HTMLElement,
  options: { paddingPx?: number } = {}
) {
  const { paddingPx = 16 } = options
  const parentRect = scrollParent.getBoundingClientRect()
  const rect = element.getBoundingClientRect()

  const overflowBottom = rect.bottom - (parentRect.bottom - paddingPx)
  const overflowTop = parentRect.top + paddingPx - rect.top

  if (overflowBottom > 0) {
    scrollParent.scrollTop += overflowBottom
  } else if (overflowTop > 0) {
    scrollParent.scrollTop -= overflowTop
  }
}

let focusedInputScrollGeneration = 0

/** Scroll after focus once the keyboard/viewport height settles. */
export function scheduleFocusedInputScroll(
  element: HTMLElement,
  scrollParent: HTMLElement
) {
  const generation = ++focusedInputScrollGeneration
  const visualViewport = window.visualViewport

  let debounceId = 0
  let timeoutId = 0
  let lastHeight = visualViewport?.height ?? 0

  const scrollOnce = () => {
    if (generation !== focusedInputScrollGeneration) return
    if (!scrollParent.contains(element)) return
    scrollFocusedInputIntoView(element, scrollParent)
  }

  const cleanup = () => {
    window.clearTimeout(debounceId)
    window.clearTimeout(timeoutId)
    visualViewport?.removeEventListener('resize', onResize)
  }

  const onResize = () => {
    if (generation !== focusedInputScrollGeneration) return

    const nextHeight = visualViewport?.height ?? lastHeight
    window.clearTimeout(debounceId)
    debounceId = window.setTimeout(() => {
      if (generation !== focusedInputScrollGeneration) return

      if (Math.abs(nextHeight - lastHeight) < 1) {
        scrollOnce()
        cleanup()
        return
      }

      lastHeight = nextHeight
    }, 80)
  }

  visualViewport?.addEventListener('resize', onResize)
  timeoutId = window.setTimeout(() => {
    scrollOnce()
    cleanup()
  }, 400)
}

export function syncAppViewportCssVars() {
  const root = document.documentElement
  const visualViewport = window.visualViewport

  if (!visualViewport) {
    root.style.setProperty(VIEWPORT_CSS_VARS.top, '0px')
    root.style.setProperty(VIEWPORT_CSS_VARS.left, '0px')
    root.style.setProperty(VIEWPORT_CSS_VARS.width, '100%')
    root.style.setProperty(VIEWPORT_CSS_VARS.height, '100svh')
    return
  }

  const nested = isInNestedKeyboardScrollContainer()
  const keyboardOpen = isKeyboardOpen()

  if (!keyboardOpen && !nested) {
    root.style.setProperty(VIEWPORT_CSS_VARS.top, '0px')
    root.style.setProperty(VIEWPORT_CSS_VARS.left, '0px')
    root.style.setProperty(VIEWPORT_CSS_VARS.width, '100%')
    root.style.setProperty(VIEWPORT_CSS_VARS.height, '100svh')
    return
  }

  root.style.setProperty(
    VIEWPORT_CSS_VARS.top,
    nested ? '0px' : `${visualViewport.offsetTop}px`
  )
  root.style.setProperty(
    VIEWPORT_CSS_VARS.left,
    nested ? '0px' : `${visualViewport.offsetLeft}px`
  )
  root.style.setProperty(VIEWPORT_CSS_VARS.width, `${visualViewport.width}px`)
  root.style.setProperty(VIEWPORT_CSS_VARS.height, `${visualViewport.height}px`)
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
    const nested = isInNestedKeyboardScrollContainer()
    const appShell = isFixedAppShellLayout()

    if (event.type === 'scroll' && nested) {
      if (appShell) resetWindowScroll()
      return
    }

    syncAppViewportCssVars()
    if (appShell) resetWindowScroll()

    if (appShell && keyboardWasOpen && !keyboardOpen) {
      if (!isManagingNestedKeyboardScroll()) {
        clampMainContentScroll()
        burstStabilizeViewportScroll(400)
      }
    }

    keyboardWasOpen = keyboardOpen
  }

  const onWindowScroll = () => {
    if (!isFixedAppShellLayout()) return
    resetWindowScroll()
    clampMainContentScroll()
  }

  const onMainScroll = () => {
    clampMainContentScroll()
  }

  const onFocusIn = (event: FocusEvent) => {
    const target = event.target
    if (!(target instanceof Node) || !main?.contains(target)) return

    const inNestedKeyboardScroll =
      target instanceof Element &&
      target.closest(NESTED_KEYBOARD_SCROLL_SELECTOR)

    requestAnimationFrame(() => {
      if (!isFixedAppShellLayout()) return
      resetWindowScroll()
      if (inNestedKeyboardScroll) {
        syncAppViewportCssVars()
      } else {
        clampMainContentScroll()
      }
    })
  }

  stabilizeViewportScroll()
  window.addEventListener('scroll', onWindowScroll, { passive: true })
  main?.addEventListener('scroll', onMainScroll, { passive: true })
  main?.addEventListener('focusin', onFocusIn)
  visualViewport?.addEventListener('resize', onViewportChange)
  visualViewport?.addEventListener('scroll', onViewportChange)

  return () => {
    window.removeEventListener('scroll', onWindowScroll)
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
