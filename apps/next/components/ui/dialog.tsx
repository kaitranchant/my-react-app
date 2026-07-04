'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'

import { useMainContentScrollLock } from '@/lib/hooks/use-main-content-scroll-lock'
import { isMobileKeypadInteraction } from '@/lib/mobile-keyboard/is-keypad-interaction'
import { cn } from '@/lib/utils'

function ViewportDialogBehavior() {
  useMainContentScrollLock(true)
  return null
}

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  viewport = false,
  visualViewport = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay> & {
  viewport?: boolean
  /** Size overlay to the visual viewport (keyboard-safe). */
  visualViewport?: boolean
}) {
  const vvCover = viewport || visualViewport

  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      data-vv-surface={vvCover ? 'cover' : undefined}
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
        vvCover && 'dialog-vv-surface-cover',
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  viewport = false,
  visualViewport = false,
  hideClose = false,
  onPointerDownOutside,
  onInteractOutside,
  onFocusOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** Fill the viewport with safe-area margins instead of vertical centering. */
  viewport?: boolean
  /** Compact dialog anchored within the visual viewport on mobile. */
  visualViewport?: boolean
  /** Hide the default top-right close button. */
  hideClose?: boolean
}) {
  const vvBehavior = viewport || visualViewport

  const handlePointerDownOutside = React.useCallback<
    NonNullable<React.ComponentProps<typeof DialogPrimitive.Content>['onPointerDownOutside']>
  >(
    (event) => {
      if (isMobileKeypadInteraction(event.target)) {
        event.preventDefault()
        return
      }
      onPointerDownOutside?.(event)
    },
    [onPointerDownOutside]
  )

  const handleInteractOutside = React.useCallback<
    NonNullable<React.ComponentProps<typeof DialogPrimitive.Content>['onInteractOutside']>
  >(
    (event) => {
      if (isMobileKeypadInteraction(event.target)) {
        event.preventDefault()
        return
      }
      onInteractOutside?.(event)
    },
    [onInteractOutside]
  )

  const handleFocusOutside = React.useCallback<
    NonNullable<React.ComponentProps<typeof DialogPrimitive.Content>['onFocusOutside']>
  >(
    (event) => {
      if (isMobileKeypadInteraction(event.target)) {
        event.preventDefault()
        return
      }
      onFocusOutside?.(event)
    },
    [onFocusOutside]
  )

  return (
    <DialogPortal>
      <DialogOverlay viewport={viewport} visualViewport={visualViewport} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-vv-surface={
          viewport ? 'inset' : visualViewport ? 'compact' : undefined
        }
        className={cn(
          'bg-background fixed z-50 shadow-elevated duration-200',
          viewport
            ? 'dialog-vv-surface-inset data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 flex flex-col overflow-hidden rounded-xl border'
            : visualViewport
              ? 'dialog-vv-surface-compact data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4 grid w-full gap-4 rounded-xl border p-6 sm:max-w-lg'
              : 'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 top-[50%] left-[50%] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border p-6 sm:max-w-lg',
          className
        )}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
        onFocusOutside={handleFocusOutside}
        {...props}
      >
        {vvBehavior ? <ViewportDialogBehavior /> : null}
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
