'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type SidebarExpandContextValue = {
  expanded: boolean
  setExpanded: (expanded: boolean) => void
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

  return (
    <SidebarExpandContext.Provider
      value={{
        expanded,
        setExpanded,
        collapse: () => setExpanded(false),
      }}
    >
      {children}
    </SidebarExpandContext.Provider>
  )
}
