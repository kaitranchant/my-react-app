import { getMobileConfig } from '../mobile-config.native'
import type { AppleHealthMetricDraft } from './read-metrics.native'

type SyncResponse =
  | { success: true; syncedDays: number }
  | { success?: false; error?: string }

export async function syncAppleHealthMetricsToServer(
  accessToken: string,
  metrics: AppleHealthMetricDraft[]
): Promise<{ syncedDays: number }> {
  const { apiUrl } = getMobileConfig()
  const response = await fetch(`${apiUrl}/api/wearables/apple-health/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ metrics }),
  })

  let payload: SyncResponse | null = null
  try {
    payload = (await response.json()) as SyncResponse
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Apple Health sync failed.')
  }

  if (!payload || typeof payload.syncedDays !== 'number') {
    throw new Error('Apple Health sync returned an unexpected response.')
  }

  return { syncedDays: payload.syncedDays }
}
