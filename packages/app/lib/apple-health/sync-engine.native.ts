import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  ensureAppleHealthAuthorization,
  readAppleHealthMetrics,
} from './read-metrics.native'
import { syncAppleHealthMetricsToServer } from './sync-client.native'
import { getAccessToken } from '../supabase.native'

const LAST_SYNC_AT_KEY = 'apple_health_last_sync_at'
const BACKGROUND_SYNC_ENABLED_KEY = 'apple_health_background_sync_enabled'
const MIN_SYNC_INTERVAL_MS = 30 * 60 * 1000

export type AppleHealthSyncSource =
  | 'manual'
  | 'foreground'
  | 'healthkit-change'
  | 'background-fetch'

export type AppleHealthSyncResult = {
  syncedDays: number
  source: AppleHealthSyncSource
}

export async function isAppleHealthBackgroundSyncEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(BACKGROUND_SYNC_ENABLED_KEY)
  return value === '1'
}

export async function setAppleHealthBackgroundSyncEnabled(
  enabled: boolean
): Promise<void> {
  if (enabled) {
    await AsyncStorage.setItem(BACKGROUND_SYNC_ENABLED_KEY, '1')
    return
  }

  await AsyncStorage.removeItem(BACKGROUND_SYNC_ENABLED_KEY)
}

async function shouldSkipDebouncedSync(force: boolean): Promise<boolean> {
  if (force) return false

  const lastSyncAt = await AsyncStorage.getItem(LAST_SYNC_AT_KEY)
  if (!lastSyncAt) return false

  const lastSyncMs = Number(lastSyncAt)
  if (!Number.isFinite(lastSyncMs)) return false

  return Date.now() - lastSyncMs < MIN_SYNC_INTERVAL_MS
}

export async function runAppleHealthSync(options?: {
  force?: boolean
  source?: AppleHealthSyncSource
}): Promise<AppleHealthSyncResult> {
  const source = options?.source ?? 'manual'
  const force = options?.force ?? source === 'manual'

  if (await shouldSkipDebouncedSync(force)) {
    throw new Error('Apple Health was synced recently. Try again later.')
  }

  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('Your session expired. Sign in again.')
  }

  await ensureAppleHealthAuthorization()
  const metrics = await readAppleHealthMetrics()
  if (metrics.length === 0) {
    throw new Error('No Apple Health data was found for the last 14 days.')
  }

  const result = await syncAppleHealthMetricsToServer(accessToken, metrics)
  await AsyncStorage.setItem(LAST_SYNC_AT_KEY, String(Date.now()))
  await setAppleHealthBackgroundSyncEnabled(true)

  return { syncedDays: result.syncedDays, source }
}

export async function runAppleHealthBackgroundSync(
  source: Exclude<AppleHealthSyncSource, 'manual'>
): Promise<AppleHealthSyncResult | null> {
  const enabled = await isAppleHealthBackgroundSyncEnabled()
  if (!enabled) return null

  const accessToken = await getAccessToken()
  if (!accessToken) return null

  if (await shouldSkipDebouncedSync(false)) {
    return null
  }

  try {
    return await runAppleHealthSync({ source, force: false })
  } catch {
    return null
  }
}

export async function getAppleHealthLastSyncedAt(): Promise<Date | null> {
  const value = await AsyncStorage.getItem(LAST_SYNC_AT_KEY)
  if (!value) return null

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null

  return new Date(parsed)
}
