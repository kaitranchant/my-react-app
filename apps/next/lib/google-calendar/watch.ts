import {
  getGoogleCalendarWebhookUrl,
  GOOGLE_CALENDAR_WATCH_TTL_MS,
  isGoogleCalendarConfigured,
} from '@/lib/google-calendar/config'
import {
  stopGoogleCalendarWatchChannel,
  watchGoogleCalendarEvents,
} from '@/lib/google-calendar/api'
import {
  updateCoachGoogleCalendarWatchState,
  type CoachGoogleCalendarConnection,
} from '@/lib/google-calendar/connection'
import { syncCoachCalendarFromGoogle } from '@/lib/google-calendar/inbound-sync'
import { getValidGoogleCalendarAccessToken } from '@/lib/google-calendar/token-store'
import { createAdminClient } from '@/lib/supabase/admin'

function createWatchToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

function createWatchChannelId(): string {
  return crypto.randomUUID()
}

export async function registerGoogleCalendarWatch(
  connection: CoachGoogleCalendarConnection
): Promise<void> {
  if (!isGoogleCalendarConfigured()) return

  const admin = createAdminClient()
  if (!admin) return

  const accessToken = await getValidGoogleCalendarAccessToken(connection.id)

  if (connection.watch_channel_id && connection.watch_resource_id) {
    try {
      await stopGoogleCalendarWatchChannel(
        accessToken,
        connection.watch_channel_id,
        connection.watch_resource_id
      )
    } catch (error) {
      console.warn('[google-calendar] stop previous watch failed', error)
    }
  }

  const channelId = createWatchChannelId()
  const watchToken = createWatchToken()
  const watch = await watchGoogleCalendarEvents(
    accessToken,
    connection.calendar_id,
    {
      channelId,
      webhookUrl: getGoogleCalendarWebhookUrl(),
      token: watchToken,
      expirationMs: GOOGLE_CALENDAR_WATCH_TTL_MS,
    }
  )

  await updateCoachGoogleCalendarWatchState(connection.id, {
    watch_channel_id: watch.channelId,
    watch_resource_id: watch.resourceId,
    watch_token: watchToken,
    watch_expiration: watch.expiration,
  })

  await syncCoachCalendarFromGoogle(connection.id)
}

export async function stopGoogleCalendarWatch(
  connection: Pick<
    CoachGoogleCalendarConnection,
    'id' | 'calendar_id' | 'watch_channel_id' | 'watch_resource_id'
  >
): Promise<void> {
  if (!connection.watch_channel_id || !connection.watch_resource_id) return

  try {
    const accessToken = await getValidGoogleCalendarAccessToken(connection.id)
    await stopGoogleCalendarWatchChannel(
      accessToken,
      connection.watch_channel_id,
      connection.watch_resource_id
    )
  } catch (error) {
    console.warn('[google-calendar] stop watch failed', error)
  }

  const admin = createAdminClient()
  if (!admin) return

  await updateCoachGoogleCalendarWatchState(connection.id, {
    watch_channel_id: null,
    watch_resource_id: null,
    watch_token: null,
    watch_expiration: null,
    calendar_sync_token: null,
  })
}

export async function renewExpiringGoogleCalendarWatches(
  renewWithinHours = 24
): Promise<{ renewed: number; failed: number }> {
  const admin = createAdminClient()
  if (!admin) {
    return { renewed: 0, failed: 0 }
  }

  const threshold = new Date(
    Date.now() + renewWithinHours * 60 * 60 * 1000
  ).toISOString()

  const { data: connections } = await admin
    .from('coach_google_calendar_connections')
    .select(
      'id, coach_id, google_email, calendar_id, sync_export_enabled, sync_busy_enabled, connected_at, watch_channel_id, watch_resource_id, watch_token, watch_expiration, calendar_sync_token, last_calendar_sync_at'
    )
    .or(`watch_expiration.is.null,watch_expiration.lt.${threshold}`)

  let renewed = 0
  let failed = 0

  for (const connection of connections ?? []) {
    try {
      await registerGoogleCalendarWatch(
        connection as CoachGoogleCalendarConnection
      )
      renewed += 1
    } catch (error) {
      failed += 1
      console.error('[google-calendar] watch renewal failed', connection.id, error)
    }
  }

  return { renewed, failed }
}

export async function handleGoogleCalendarWebhook(input: {
  channelId: string | null
  channelToken: string | null
  resourceId: string | null
  resourceState: string | null
}): Promise<void> {
  if (!input.channelId) return

  const admin = createAdminClient()
  if (!admin) return

  const { data: connection } = await admin
    .from('coach_google_calendar_connections')
    .select(
      'id, coach_id, google_email, calendar_id, sync_export_enabled, sync_busy_enabled, connected_at, watch_channel_id, watch_resource_id, watch_token, watch_expiration, calendar_sync_token, last_calendar_sync_at'
    )
    .eq('watch_channel_id', input.channelId)
    .maybeSingle()

  if (!connection) return

  if (
    input.channelToken &&
    connection.watch_token &&
    input.channelToken !== connection.watch_token
  ) {
    console.warn('[google-calendar] webhook token mismatch', connection.id)
    return
  }

  if (input.resourceId && connection.watch_resource_id !== input.resourceId) {
    console.warn('[google-calendar] webhook resource mismatch', connection.id)
    return
  }

  if (input.resourceState === 'not_exists') {
    await registerGoogleCalendarWatch(connection as CoachGoogleCalendarConnection)
    return
  }

  await syncCoachCalendarFromGoogle(connection.id)
}
