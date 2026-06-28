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

  stabilizeViewportScroll()
  window.addEventListener('scroll', resetWindowScroll, { passive: true })
  visualViewport?.addEventListener('resize', onViewportChange)
  visualViewport?.addEventListener('scroll', onViewportChange)

  return () => {
    window.removeEventListener('scroll', resetWindowScroll)
    visualViewport?.removeEventListener('resize', onViewportChange)
    visualViewport?.removeEventListener('scroll', onViewportChange)

    const root = document.documentElement
    root.style.removeProperty(VIEWPORT_CSS_VARS.top)
    root.style.removeProperty(VIEWPORT_CSS_VARS.left)
    root.style.removeProperty(VIEWPORT_CSS_VARS.width)
    root.style.removeProperty(VIEWPORT_CSS_VARS.height)
  }
}
