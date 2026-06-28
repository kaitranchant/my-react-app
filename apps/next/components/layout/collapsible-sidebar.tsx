'use client'

import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react'

import { cn } from '@/lib/utils'
import {
  SidebarExpandProvider,
  useSidebarExpand,
} from '@/components/layout/sidebar-expand-context'

type CollapsibleSidebarProps = {
  header: ReactNode
  children: ReactNode
  className?: string
}

function CollapsibleSidebarAside({
  header,
  children,
}: {
  header: ReactNode
  children: ReactNode
}) {
  const { expanded, touchPinned, setExpanded, expandFromTouch, collapse } =
    useSidebarExpand()

  function handleAsidePointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== 'touch') return
    if (expanded) return

    const link = (event.target as HTMLElement).closest('a')
    if (link) {
      event.preventDefault()
    }
    expandFromTouch()
  }

  return (
    <>
      {expanded && touchPinned ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/20"
          onPointerUp={(event) => {
            if (event.pointerType === 'touch') {
              collapse()
            }
          }}
        />
      ) : null}

      <aside
        onMouseEnter={() => {
          if (!touchPinned) {
            setExpanded(true)
          }
        }}
        onMouseLeave={() => {
          if (!touchPinned) {
            setExpanded(false)
          }
        }}
        onPointerUp={handleAsidePointerUp}
        className={cn(
          'bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r transition-[width,box-shadow] duration-200 ease-out',
          expanded ? 'w-[240px] shadow-lg' : 'w-16'
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center',
            expanded ? 'justify-start px-3' : 'justify-center px-0'
          )}
        >
          {header}
        </div>

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-x-hidden pb-6',
            expanded ? 'overflow-y-auto px-3' : 'touch-none overflow-y-hidden px-2'
          )}
        >
          {children}
        </div>
      </aside>
    </>
  )
}

export function CollapsibleSidebar({
  header,
  children,
  className,
}: CollapsibleSidebarProps) {
  return (
    <div className={cn('relative hidden h-full w-16 shrink-0 md:block', className)}>
      <SidebarExpandProvider>
        <CollapsibleSidebarAside header={header} children={children} />
      </SidebarExpandProvider>
    </div>
  )
}

export { useSidebarExpand } from '@/components/layout/sidebar-expand-context'
