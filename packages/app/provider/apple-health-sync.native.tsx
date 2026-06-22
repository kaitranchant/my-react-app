'use client'

import { useAppleHealthBackgroundSync } from 'app/hooks/use-apple-health-background-sync.native'

export function AppleHealthSyncBootstrap() {
  useAppleHealthBackgroundSync()
  return null
}
