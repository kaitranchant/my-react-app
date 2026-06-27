'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { usePrefersHover } from '@/lib/use-prefers-hover'
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
  const { expanded, setExpanded, collapse } = useSidebarExpand()
  const prefersHover = usePrefersHover()

  function toggleExpanded() {
    setExpanded(!expanded)
  }

  return (
    <>
      {!prefersHover && expanded ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-30 bg-black/20"
          onClick={collapse}
        />
      ) : null}

      <aside
        onMouseEnter={() => prefersHover && setExpanded(true)}
        onMouseLeave={() => prefersHover && setExpanded(false)}
        className={cn(
          'bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r transition-[width,box-shadow] duration-200 ease-out',
          expanded ? 'w-[240px] shadow-lg' : 'w-16'
        )}
      >
        <button
          type="button"
          aria-label={expanded ? 'Collapse navigation menu' : 'Expand navigation menu'}
          aria-expanded={expanded}
          onClick={() => {
            if (!prefersHover) {
              toggleExpanded()
            }
          }}
          className={cn(
            'flex h-16 shrink-0 items-center border-0 bg-transparent p-0 text-inherit',
            expanded ? 'cursor-default justify-start px-3' : 'justify-center px-0',
            prefersHover && 'pointer-events-none'
          )}
        >
          {header}
        </button>

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain pb-6',
            expanded ? 'px-3' : 'px-2'
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
