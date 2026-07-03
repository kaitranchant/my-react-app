'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Keyboard } from 'lucide-react'

import { cn } from '@/lib/utils'

export const KEYPAD_EXIT_MS = 260

export type ViewportFrame = {
  left: number
  width: number
  bottom: number
  maxHeight: number
}

export function getViewportFrame(): ViewportFrame {
  if (typeof window === 'undefined') {
    return { left: 0, width: 0, bottom: 0, maxHeight: 0 }
  }

  const visualViewport = window.visualViewport
  if (!visualViewport) {
    return {
      left: 0,
      width: document.documentElement.clientWidth,
      bottom: 0,
      maxHeight: window.innerHeight,
    }
  }

  return {
    left: visualViewport.offsetLeft,
    width: visualViewport.width,
    bottom: Math.max(
      0,
      window.innerHeight - visualViewport.height - visualViewport.offsetTop
    ),
    maxHeight: Math.max(
      0,
      visualViewport.height - visualViewport.offsetTop - 8
    ),
  }
}

export function useViewportFrame(active: boolean) {
  const [frame, setFrame] = React.useState<ViewportFrame>(getViewportFrame)

  React.useEffect(() => {
    if (!active) return

    const update = () => setFrame(getViewportFrame())
    update()

    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', update)
    visualViewport?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      visualViewport?.removeEventListener('resize', update)
      visualViewport?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [active])

  return frame
}

export function HideKeyboardIcon({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex flex-col items-center leading-none', className)}>
      <Keyboard className="size-4" />
      <ChevronDown className="-mt-0.5 size-3" strokeWidth={2.5} />
    </span>
  )
}

export function KeypadButton({
  children,
  className,
  variant = 'default',
  onClick,
  'aria-label': ariaLabel,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'accent' | 'icon' | 'wide'
  onClick: () => void
  'aria-label': string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-w-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 sm:rounded-xl sm:text-base touch-manipulation',
        variant === 'accent' &&
          'bg-brand text-brand-foreground hover:bg-brand/90',
        variant === 'icon' &&
          'bg-muted/80 text-foreground hover:bg-muted',
        variant === 'wide' &&
          'bg-muted/80 text-foreground hover:bg-muted',
        variant === 'default' &&
          'bg-muted/80 text-foreground hover:bg-muted',
        className
      )}
    >
      {children}
    </button>
  )
}

export function KeypadReserve({
  enabled,
  reserveHeight,
}: {
  enabled: boolean
  reserveHeight: number
}) {
  if (!enabled) {
    return null
  }

  return (
    <div
      aria-hidden
      className="shrink-0 transition-[height] duration-300 ease-out"
      style={{ height: reserveHeight }}
    />
  )
}

type KeypadSurfaceOverlayProps = {
  enabled: boolean
  isOpen: boolean
  ariaLabel: string
  reserveHeight: number
  onReserveHeightChange: (height: number) => void
  children: React.ReactNode
  header?: React.ReactNode
}

export function KeypadSurfaceOverlay({
  enabled,
  isOpen,
  ariaLabel,
  reserveHeight: _reserveHeight,
  onReserveHeightChange,
  children,
  header,
}: KeypadSurfaceOverlayProps) {
  const [renderContent, setRenderContent] = React.useState(isOpen)
  const [motionState, setMotionState] = React.useState<
    'closed' | 'open' | 'closing'
  >('closed')
  const [canPortal, setCanPortal] = React.useState(false)
  const surfaceRef = React.useRef<HTMLDivElement>(null)
  const wasOpenRef = React.useRef(isOpen)
  const viewport = useViewportFrame(Boolean(enabled && renderContent))

  React.useEffect(() => {
    setCanPortal(true)
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      wasOpenRef.current = false
      setRenderContent(false)
      setMotionState('closed')
      onReserveHeightChange(0)
      return
    }

    if (isOpen) {
      setRenderContent(true)
      if (!wasOpenRef.current) {
        setMotionState('closed')
        const frame = requestAnimationFrame(() => {
          requestAnimationFrame(() => setMotionState('open'))
        })
        wasOpenRef.current = true
        return () => cancelAnimationFrame(frame)
      }
      setMotionState('open')
      wasOpenRef.current = true
      return
    }

    wasOpenRef.current = false
    if (!renderContent) return

    setMotionState('closing')
    const timer = window.setTimeout(() => {
      setRenderContent(false)
      setMotionState('closed')
      onReserveHeightChange(0)
    }, KEYPAD_EXIT_MS)

    return () => window.clearTimeout(timer)
  }, [enabled, isOpen, onReserveHeightChange, renderContent])

  React.useLayoutEffect(() => {
    if (!enabled || !renderContent || !surfaceRef.current) return

    const surface = surfaceRef.current
    const updateReserve = () => {
      if (motionState === 'closing') return
      onReserveHeightChange(surface.offsetHeight)
    }

    updateReserve()

    const observer = new ResizeObserver(updateReserve)
    observer.observe(surface)

    return () => observer.disconnect()
  }, [enabled, motionState, onReserveHeightChange, renderContent])

  React.useEffect(() => {
    if (!enabled) return
    const root = document.documentElement
    if (isOpen && motionState === 'open') {
      root.setAttribute('data-mobile-keyboard-open', '')
    } else if (!isOpen && motionState === 'closed') {
      root.removeAttribute('data-mobile-keyboard-open')
    }
    return () => {
      if (!isOpen) {
        root.removeAttribute('data-mobile-keyboard-open')
      }
    }
  }, [enabled, isOpen, motionState])

  if (!enabled || !renderContent || !canPortal) {
    return null
  }

  const overlay = (
    <div
      ref={surfaceRef}
      role="group"
      aria-label={ariaLabel}
      aria-hidden={!isOpen}
      data-state={
        motionState === 'closing'
          ? 'closing'
          : motionState === 'open'
            ? 'open'
            : 'closed'
      }
      className="mobile-keypad-surface"
      data-mobile-keypad=""
      style={{
        left: viewport.left,
        width: viewport.width,
        bottom: viewport.bottom,
        maxHeight: viewport.maxHeight > 0 ? viewport.maxHeight : undefined,
      }}
    >
      {header ? (
        <div className="min-h-0 flex-1 overflow-y-auto border-b">{header}</div>
      ) : null}
      <div className="shrink-0">{children}</div>
    </div>
  )

  return createPortal(overlay, document.body)
}
