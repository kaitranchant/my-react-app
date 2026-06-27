'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'

import { markClientFormReviewsAsViewed } from '@/app/portal/form-review-actions'
import { markPortalMessagesRead } from '@/app/portal/message-actions'
import {
  emptyPortalNavBadges,
  type PortalNavBadges,
} from '@/lib/portal-nav-badges'

const PortalNavBadgesContext = React.createContext<PortalNavBadges>(
  emptyPortalNavBadges
)

export function usePortalNavBadges() {
  return React.useContext(PortalNavBadgesContext)
}

type PortalNavBadgesProviderProps = {
  initialBadges: PortalNavBadges
  children: React.ReactNode
}

export function PortalNavBadgesProvider({
  initialBadges,
  children,
}: PortalNavBadgesProviderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [badges, setBadges] = React.useState(initialBadges)
  const syncedUnreadRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    setBadges(initialBadges)
  }, [initialBadges])

  React.useEffect(() => {
    let cancelled = false

    async function acknowledgeSection() {
      if (pathname.startsWith('/portal/messages')) {
        if (syncedUnreadRef.current === 'messages') return
        syncedUnreadRef.current = 'messages'

        const result = await markPortalMessagesRead()
        if (cancelled) return

        if (result.success) {
          setBadges((current) => ({ ...current, unreadMessages: 0 }))
          router.refresh()
        } else {
          syncedUnreadRef.current = null
        }
        return
      }

      syncedUnreadRef.current = null

      if (pathname.startsWith('/portal/form-review')) {
        const result = await markClientFormReviewsAsViewed()
        if (cancelled) return

        if (result.success) {
          setBadges((current) => ({ ...current, unreadFormReviewReplies: 0 }))
          router.refresh()
        }
      }
    }

    void acknowledgeSection()

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  return (
    <PortalNavBadgesContext.Provider value={badges}>
      {children}
    </PortalNavBadgesContext.Provider>
  )
}
