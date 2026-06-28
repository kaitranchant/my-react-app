'use client'

import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  burstStabilizeViewportScroll,
  resetWindowScroll,
} from '@/lib/visual-viewport/app-viewport'
import { installMainContentFreeze } from '@/lib/visual-viewport/freeze-main-content'

type TabletFullscreenOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  children: ReactNode
}

export function TabletFullscreenOverlay({
  open,
  onOpenChange,
  label,
  children,
}: TabletFullscreenOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    resetWindowScroll()
    const releaseMain = installMainContentFreeze()
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      releaseMain()
      document.body.style.overflow = previousBodyOverflow
      resetWindowScroll()
      burstStabilizeViewportScroll(600)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const overlay = overlayRef.current
    const visualViewport = window.visualViewport
    if (!overlay || !visualViewport) return

    const apply = () => {
      const keyboardOpen =
        visualViewport.height < window.innerHeight - 100

      if (keyboardOpen) {
        overlay.style.top = `${visualViewport.offsetTop}px`
        overlay.style.left = `${visualViewport.offsetLeft}px`
        overlay.style.width = `${visualViewport.width}px`
        overlay.style.height = `${visualViewport.height}px`
      } else {
        overlay.style.top = '0px'
        overlay.style.left = '0px'
        overlay.style.width = '100%'
        overlay.style.height = '100svh'
      }
    }

    apply()
    visualViewport.addEventListener('resize', apply)
    visualViewport.addEventListener('scroll', apply)

    return () => {
      visualViewport.removeEventListener('resize', apply)
      visualViewport.removeEventListener('scroll', apply)
      overlay.style.top = ''
      overlay.style.left = ''
      overlay.style.width = ''
      overlay.style.height = ''
    }
  }, [open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="bg-background fixed z-[100] flex flex-col overflow-hidden"
    >
      {children}
    </div>,
    document.body
  )
}
