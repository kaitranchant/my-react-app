import type {
  ClientWearableConnection,
  WearableConnectionStatus,
  WearableProvider,
} from 'app/types/database'

export type WearableProviderConfig = {
  provider: WearableProvider
  label: string
  description: string
  connectHint: string
}

export const APPLE_HEALTH_MOBILE_SCHEME = 'coaching-app'
export const APPLE_HEALTH_MOBILE_PATH = 'wearables/apple-health'
export const APPLE_HEALTH_MOBILE_DEEP_LINK = `${APPLE_HEALTH_MOBILE_SCHEME}://${APPLE_HEALTH_MOBILE_PATH}`

export const WEARABLE_PROVIDERS: WearableProviderConfig[] = [
  {
    provider: 'whoop',
    label: 'Whoop',
    description: 'Recovery, strain, sleep, and HRV from your Whoop band.',
    connectHint: 'OAuth sign-in with Whoop (coming soon).',
  },
  {
    provider: 'garmin',
    label: 'Garmin',
    description: 'Steps, sleep, resting heart rate, and training load.',
    connectHint: 'OAuth sign-in with Garmin Connect (coming soon).',
  },
  {
    provider: 'oura',
    label: 'Oura',
    description: 'Sleep stages, readiness, and activity from Oura Ring.',
    connectHint: 'OAuth sign-in with Oura (coming soon).',
  },
  {
    provider: 'apple_health',
    label: 'Apple Health',
    description: 'Steps, sleep, and heart rate synced from the mobile app.',
    connectHint: 'Available through the Coaching App on iPhone (coming soon).',
  },
  {
    provider: 'fitbit',
    label: 'Fitbit',
    description: 'Steps, sleep, and resting heart rate from Fitbit devices.',
    connectHint: 'OAuth sign-in with Fitbit (coming soon).',
  },
]

export function getWearableProviderConfig(
  provider: WearableProvider
): WearableProviderConfig {
  const config = WEARABLE_PROVIDERS.find((row) => row.provider === provider)
  if (!config) {
    throw new Error(`Unknown wearable provider: ${provider}`)
  }
  return config
}

export function getWearableProviderLabel(provider: WearableProvider): string {
  return getWearableProviderConfig(provider).label
}

export function isWearableConnectionActive(
  connection: Pick<ClientWearableConnection, 'status'> | null | undefined
): boolean {
  return connection?.status === 'connected' || connection?.status === 'pending'
}

export function getWearableConnectionStatusLabel(
  status: WearableConnectionStatus | null | undefined
): string {
  switch (status) {
    case 'connected':
      return 'Connected'
    case 'pending':
      return 'Pending sync'
    case 'error':
      return 'Sync error'
    case 'disconnected':
      return 'Disconnected'
    default:
      return 'Not connected'
  }
}

export function getWearableConnectionStatusVariant(
  status: WearableConnectionStatus | null | undefined
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'connected':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'error':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function formatWearableMetricValue(
  value: number | null | undefined,
  unit?: string
): string {
  if (value == null || Number.isNaN(value)) return '—'
  const formatted =
    Number.isInteger(value) || unit === 'steps'
      ? Math.round(value).toLocaleString('en-US')
      : value.toLocaleString('en-US', { maximumFractionDigits: 1 })
  return unit ? `${formatted} ${unit}` : formatted
}

export function formatWearableSleepHours(hours: number | null | undefined): string {
  if (hours == null || Number.isNaN(hours)) return '—'
  return `${hours.toLocaleString('en-US', { maximumFractionDigits: 1 })} hrs`
}

export function formatWearableLastSynced(
  lastSyncedAt: string | null | undefined
): string {
  if (!lastSyncedAt) return 'Never'
  const date = new Date(lastSyncedAt)
  if (Number.isNaN(date.getTime())) return '—'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function getRecoveryScoreVariant(
  score: number | null | undefined
): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (score == null) return 'secondary'
  if (score >= 67) return 'success'
  if (score >= 34) return 'warning'
  return 'destructive'
}
