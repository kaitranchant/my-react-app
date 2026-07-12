'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

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

  const collapse = useCallback(() => {
    setExpanded(false)
    setTouchPinned(false)
  }, [])

  const expandFromTouch = useCallback(() => {
    setExpanded(true)
    setTouchPinned(true)
  }, [])

  const value = useMemo(
    () => ({
      expanded,
      touchPinned,
      setExpanded,
      expandFromTouch,
      collapse,
    }),
    [collapse, expandFromTouch, expanded, touchPinned]
  )

  return (
    <SidebarExpandContext.Provider value={value}>
      {children}
    </SidebarExpandContext.Provider>
  )
}
