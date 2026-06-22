'use client'

import * as React from 'react'

import { startAppleHealthBackgroundSync } from 'app/lib/apple-health/background-sync.native'
import { isMobileConfigReady } from 'app/lib/mobile-config.native'
import { getSupabaseClient } from 'app/lib/supabase.native'

export function useAppleHealthBackgroundSync() {
  React.useEffect(() => {
    if (!isMobileConfigReady()) {
      return undefined
    }

    let cleanup: (() => void) | undefined
    let active = true
    const supabase = getSupabaseClient()

    async function attachBackgroundSync(hasSession: boolean) {
      cleanup?.()
      cleanup = undefined

      if (!active || !hasSession) {
        return
      }

      cleanup = await startAppleHealthBackgroundSync()
    }

    void supabase.auth.getSession().then(({ data }) => {
      void attachBackgroundSync(Boolean(data.session))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void attachBackgroundSync(Boolean(session))
    })

    return () => {
      active = false
      cleanup?.()
      subscription.unsubscribe()
    }
  }, [])
}
