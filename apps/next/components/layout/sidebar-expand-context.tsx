'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type SidebarExpandContextValue = {
  expanded: boolean
  touchPinned: boolean
  setExpanded: (expanded: boolean) => void
  expandFromTouch: () => void
  collapse: () => void
}

const SidebarExpandContext = createContext<SidebarExpandContextValue | null>(null)

export function useSidebarExpand() {
  const value = useContext(SidebarExpandContext)
  if (!value) {
    throw new Error('useSidebarExpand must be used within CollapsibleSidebar')
  }
  return value
}

export function SidebarExpandProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const [touchPinned, setTouchPinned] = useState(false)

  function collapse() {
    setExpanded(false)
    setTouchPinned(false)
  }

  function expandFromTouch() {
    setExpanded(true)
    setTouchPinned(true)
  }

  return (
    <SidebarExpandContext.Provider
      value={{
        expanded,
        touchPinned,
        setExpanded,
        expandFromTouch,
        collapse,
      }}
    >
      {children}
    </SidebarExpandContext.Provider>
  )
}
