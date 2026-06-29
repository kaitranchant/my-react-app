'use client'

const VIEWPORT_CSS_VARS = {
  top: '--app-vv-top',
  left: '--app-vv-left',
  width: '--app-vv-width',
  height: '--app-vv-height',
} as const

const KEYBOARD_OPEN_HEIGHT_DELTA_PX = 120

export function resetWindowScroll() {
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

function isKeyboardOpen() {
  const visualViewport = window.visualViewport
  if (!visualViewport) return false
  return visualViewport.height < window.innerHeight - KEYBOARD_OPEN_HEIGHT_DELTA_PX
}

export function syncAppViewportCssVars() {
  const root = document.documentElement
  const visualViewport = window.visualViewport

  if (!visualViewport || !isKeyboardOpen()) {
    root.style.setProperty(VIEWPORT_CSS_VARS.top, '0px')
    root.style.setProperty(VIEWPORT_CSS_VARS.left, '0px')
    root.style.setProperty(VIEWPORT_CSS_VARS.width, '100%')
    root.style.setProperty(VIEWPORT_CSS_VARS.height, '100svh')
    return
  }

  root.style.setProperty(VIEWPORT_CSS_VARS.top, `${visualViewport.offsetTop}px`)
  root.style.setProperty(VIEWPORT_CSS_VARS.left, `${visualViewport.offsetLeft}px`)
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

  const onViewportChange = () => {
    const keyboardOpen = isKeyboardOpen()
    syncAppViewportCssVars()
    resetWindowScroll()

    if (keyboardWasOpen && !keyboardOpen) {
      clampMainContentScroll()
      burstStabilizeViewportScroll(400)
    }

    keyboardWasOpen = keyboardOpen
  }

  const onWindowScroll = () => {
    resetWindowScroll()
    clampMainContentScroll()
  }

  const onMainScroll = () => {
    clampMainContentScroll()
  }

  const onFocusIn = (event: FocusEvent) => {
    const target = event.target
    if (!(target instanceof Node) || !main?.contains(target)) return

    requestAnimationFrame(() => {
      clampMainContentScroll()
      resetWindowScroll()
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
