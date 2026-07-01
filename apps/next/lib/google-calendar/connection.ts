import type { SupabaseClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'

export type CoachGoogleCalendarConnection = {
  id: string
  coach_id: string
  google_email: string
  calendar_id: string
  sync_export_enabled: boolean
  sync_busy_enabled: boolean
  connected_at: string
  watch_channel_id: string | null
  watch_resource_id: string | null
  watch_token: string | null
  watch_expiration: string | null
  calendar_sync_token: string | null
  last_calendar_sync_at: string | null
}

const CONNECTION_SELECT =
  'id, coach_id, google_email, calendar_id, sync_export_enabled, sync_busy_enabled, connected_at, watch_channel_id, watch_resource_id, watch_token, watch_expiration, calendar_sync_token, last_calendar_sync_at'

export async function fetchCoachGoogleCalendarConnection(
  supabase: SupabaseClient,
  coachId: string
): Promise<CoachGoogleCalendarConnection | null> {
  const { data, error } = await supabase
    .from('coach_google_calendar_connections')
    .select(CONNECTION_SELECT)
    .eq('coach_id', coachId)
    .maybeSingle()

  if (error) {
    if (error.message.includes('coach_google_calendar_connections')) {
      return null
    }
    throw new Error(error.message)
  }

  return (data as CoachGoogleCalendarConnection | null) ?? null
}

export async function fetchCoachGoogleCalendarConnectionById(
  connectionId: string
): Promise<CoachGoogleCalendarConnection | null> {
  const admin = createAdminClient()
  if (!admin) return null

  const { data, error } = await admin
    .from('coach_google_calendar_connections')
    .select(CONNECTION_SELECT)
    .eq('id', connectionId)
    .maybeSingle()

  if (error || !data) return null
  return data as CoachGoogleCalendarConnection
}

export async function upsertCoachGoogleCalendarConnection(input: {
  coachId: string
  googleEmail: string
  calendarId?: string
}): Promise<CoachGoogleCalendarConnection> {
  const admin = createAdminClient()
  if (!admin) {
    throw new Error('Supabase service role is not configured.')
  }

  const { data, error } = await admin
    .from('coach_google_calendar_connections')
    .upsert(
      {
        coach_id: input.coachId,
        google_email: input.googleEmail,
        calendar_id: input.calendarId ?? 'primary',
        sync_export_enabled: true,
        sync_busy_enabled: true,
      },
      { onConflict: 'coach_id' }
    )
    .select(CONNECTION_SELECT)
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not save Google Calendar connection.')
  }

  return data as CoachGoogleCalendarConnection
}

export async function updateCoachGoogleCalendarWatchState(
  connectionId: string,
  values: {
    watch_channel_id?: string | null
    watch_resource_id?: string | null
    watch_token?: string | null
    watch_expiration?: string | null
    calendar_sync_token?: string | null
    last_calendar_sync_at?: string | null
  }
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  await admin
    .from('coach_google_calendar_connections')
    .update(values)
    .eq('id', connectionId)
}

export async function deleteCoachGoogleCalendarConnection(
  coachId: string
): Promise<void> {
  const admin = createAdminClient()
  if (!admin) return

  await admin
    .from('coach_google_calendar_connections')
    .delete()
    .eq('coach_id', coachId)
}

export function isGoogleCalendarSchemaError(message: string): boolean {
  return message.includes('coach_google_calendar_connections')
}
