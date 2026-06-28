'use client'

const VIEWPORT_CSS_VARS = {
  top: '--app-vv-top',
  left: '--app-vv-left',
  width: '--app-vv-width',
  height: '--app-vv-height',
} as const

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

export function syncAppViewportCssVars() {
  const root = document.documentElement
  const visualViewport = window.visualViewport

  if (!visualViewport) {
    root.style.setProperty(VIEWPORT_CSS_VARS.top, '0px')
    root.style.setProperty(VIEWPORT_CSS_VARS.left, '0px')
    root.style.setProperty(VIEWPORT_CSS_VARS.width, '100%')
    root.style.setProperty(VIEWPORT_CSS_VARS.height, '100dvh')
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

function isTextField(element: Element | null) {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element?.getAttribute('contenteditable') === 'true'
  )
}

export function installAppViewportSync() {
  const visualViewport = window.visualViewport

  const onViewportChange = () => {
    stabilizeViewportScroll()
  }

  const onFocusIn = (event: FocusEvent) => {
    if (!isTextField(event.target as Element)) return
    burstStabilizeViewportScroll()
  }

  const onFocusOut = () => {
    window.setTimeout(() => {
      if (!isTextField(document.activeElement)) {
        burstStabilizeViewportScroll(350)
      }
    }, 100)
  }

  stabilizeViewportScroll()
  window.addEventListener('scroll', resetWindowScroll, { passive: true })
  visualViewport?.addEventListener('resize', onViewportChange)
  visualViewport?.addEventListener('scroll', onViewportChange)
  document.addEventListener('focusin', onFocusIn, true)
  document.addEventListener('focusout', onFocusOut, true)

  return () => {
    window.removeEventListener('scroll', resetWindowScroll)
    visualViewport?.removeEventListener('resize', onViewportChange)
    visualViewport?.removeEventListener('scroll', onViewportChange)
    document.removeEventListener('focusin', onFocusIn, true)
    document.removeEventListener('focusout', onFocusOut, true)

    const root = document.documentElement
    root.style.removeProperty(VIEWPORT_CSS_VARS.top)
    root.style.removeProperty(VIEWPORT_CSS_VARS.left)
    root.style.removeProperty(VIEWPORT_CSS_VARS.width)
    root.style.removeProperty(VIEWPORT_CSS_VARS.height)
  }
}
