'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Keyboard } from 'lucide-react'

import { cn } from '@/lib/utils'

export const KEYPAD_EXIT_MS = 260

/** Shared padding and gap for all custom keypad grids. */
export const KEYPAD_GRID_CLASS =
  'keypad-grid box-border grid w-full max-w-full min-w-0 px-2.5 pt-2 pb-1.5 sm:px-3 sm:pt-2.5 sm:pb-2'

export const KEYPAD_ROW_HEIGHT = 'minmax(3.25rem, auto)'

export const KEYPAD_KEY_CLASS = 'h-full min-h-12 sm:min-h-[3.25rem]'

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
      tabIndex={-1}
      aria-label={ariaLabel}
      disabled={disabled}
      // Keep focus on the active field. Layout switches (123 ↔ ABC) unmount this
      // button; without this, focus jumps to document.body and Radix closes sheets.
      onMouseDown={(event) => {
        event.preventDefault()
      }}
      onClick={onClick}
      className={cn(
        'flex min-w-0 select-none items-center justify-center rounded-xl text-base font-semibold transition-[transform,opacity,background-color] duration-75 disabled:pointer-events-none disabled:opacity-40 sm:text-lg touch-manipulation [-webkit-tap-highlight-color:transparent] active:scale-[0.96] active:opacity-90',
        variant === 'accent' &&
          'bg-brand text-brand-foreground hover:bg-brand/90 active:bg-brand/80',
        variant === 'icon' &&
          'bg-muted/80 text-foreground hover:bg-muted active:bg-muted/70',
        variant === 'wide' &&
          'bg-muted/80 text-foreground hover:bg-muted active:bg-muted/70',
        variant === 'default' &&
          'bg-muted/80 text-foreground hover:bg-muted active:bg-muted/70',
        className
      )}
      style={{ touchAction: 'manipulation' }}
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
  const previousHeightRef = React.useRef(reserveHeight)
  const isCollapsing = reserveHeight < previousHeightRef.current

  React.useEffect(() => {
    previousHeightRef.current = reserveHeight
  }, [reserveHeight])

  if (!enabled) {
    return null
  }

  return (
    <div
      aria-hidden
      className="shrink-0"
      style={{
        height: reserveHeight,
        // Expand instantly on open; ease closed so the page doesn't snap back.
        transition: isCollapsing
          ? `height ${KEYPAD_EXIT_MS}ms ease-out`
          : undefined,
      }}
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
    // Collapse the spacer with the exit animation instead of snapping after it.
    onReserveHeightChange(0)
    const timer = window.setTimeout(() => {
      setRenderContent(false)
      setMotionState('closed')
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
