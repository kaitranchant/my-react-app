'use client'

import { useEffect } from 'react'

function clampMainContentScroll() {
  const main = document.getElementById('main-content')
  if (!main) return

  const maxScroll = Math.max(0, main.scrollHeight - main.clientHeight)
  if (main.scrollTop > maxScroll) {
    main.scrollTop = maxScroll
  }
}

function resetWindowScroll() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

export function AppShellScrollLock() {
  useEffect(() => {
    const { documentElement, body } = document
    const previousHtmlOverflow = documentElement.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousHtmlHeight = documentElement.style.height
    const previousBodyHeight = body.style.height
    const previousBodyPosition = body.style.position
    const previousBodyWidth = body.style.width
    const previousBodyTop = body.style.top
    const previousBodyLeft = body.style.left
    const previousBodyRight = body.style.right

    documentElement.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    documentElement.style.height = '100%'
    body.style.height = '100%'
    body.style.position = 'fixed'
    body.style.width = '100%'
    body.style.top = '0'
    body.style.left = '0'
    body.style.right = '0'

    const preventWindowScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        resetWindowScroll()
      }
    }

    const visualViewport = window.visualViewport

    const onViewportChange = () => {
      resetWindowScroll()
      clampMainContentScroll()
    }

    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement
        const focusInField =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement ||
          active?.getAttribute('contenteditable') === 'true'

        if (!focusInField) {
          resetWindowScroll()
          clampMainContentScroll()
        }
      }, 150)
    }

    window.addEventListener('scroll', preventWindowScroll, { passive: true })
    visualViewport?.addEventListener('resize', onViewportChange)
    visualViewport?.addEventListener('scroll', onViewportChange)
    body.addEventListener('focusout', onFocusOut, true)

    resetWindowScroll()

    return () => {
      window.removeEventListener('scroll', preventWindowScroll)
      visualViewport?.removeEventListener('resize', onViewportChange)
      visualViewport?.removeEventListener('scroll', onViewportChange)
      body.removeEventListener('focusout', onFocusOut, true)
      documentElement.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      documentElement.style.height = previousHtmlHeight
      body.style.height = previousBodyHeight
      body.style.position = previousBodyPosition
      body.style.width = previousBodyWidth
      body.style.top = previousBodyTop
      body.style.left = previousBodyLeft
      body.style.right = previousBodyRight
    }
  }, [])

  return null
}
