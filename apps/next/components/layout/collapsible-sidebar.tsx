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
  const { expanded, setExpanded } = useSidebarExpand()

  function handleHeaderPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'touch') return
    setExpanded(!expanded)
  }

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        'bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r transition-[width,box-shadow] duration-200 ease-out',
        expanded ? 'w-[240px] shadow-lg' : 'w-16'
      )}
    >
      <div
        onPointerUp={handleHeaderPointerUp}
        className={cn(
          'flex h-16 shrink-0 items-center',
          expanded ? 'justify-start px-3' : 'justify-center px-0'
        )}
      >
        {header}
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pb-6',
          expanded ? 'px-3' : 'px-2'
        )}
      >
        {children}
      </div>
    </aside>
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
