'use server'

import { revalidatePath } from 'next/cache'

import type { ActionResult } from '@/app/(dashboard)/attendance/actions'
import { deleteCoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import { deleteGoogleCalendarTokens } from '@/lib/google-calendar/token-store'
import {
  type RepairRecurringSeriesSyncResult,
  repairCoachRecurringSeriesGoogleSync,
} from '@/lib/google-calendar/repair-series-sync'
import {
  type ResetRebookResult,
  resetAndRebookCoachRecurringSeries,
} from '@/lib/scheduling/coach-series-reset'
import { stopGoogleCalendarWatch } from '@/lib/google-calendar/watch'
import { createClient } from '@/lib/supabase/server'

function revalidateScheduling() {
  revalidatePath('/scheduling')
}

async function requireCoach() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return { supabase, user }
}

export async function disconnectGoogleCalendar(): Promise<ActionResult> {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { data: connection } = await ctx.supabase
    .from('coach_google_calendar_connections')
    .select(
      'id, coach_id, google_email, calendar_id, sync_export_enabled, sync_busy_enabled, connected_at, watch_channel_id, watch_resource_id, watch_token, watch_expiration, calendar_sync_token, last_calendar_sync_at'
    )
    .eq('coach_id', ctx.user.id)
    .maybeSingle()

  if (connection) {
    await stopGoogleCalendarWatch(connection)
    await deleteGoogleCalendarTokens(connection.id)
  }

  await deleteCoachGoogleCalendarConnection(ctx.user.id)
  revalidateScheduling()
  return { success: true }
}

export async function updateGoogleCalendarSyncSettings(values: {
  syncExportEnabled: boolean
  syncBusyEnabled: boolean
}): Promise<ActionResult> {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  const { error } = await ctx.supabase
    .from('coach_google_calendar_connections')
    .update({
      sync_export_enabled: values.syncExportEnabled,
      sync_busy_enabled: values.syncBusyEnabled,
    })
    .eq('coach_id', ctx.user.id)

  revalidateScheduling()
  return { success: true }
}

export type RepairRecurringSeriesCalendarSyncResult =
  | { success: true; summary: RepairRecurringSeriesSyncResult }
  | { success: false; error: string }

export async function repairRecurringSeriesCalendarSync(): Promise<RepairRecurringSeriesCalendarSyncResult> {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  try {
    const summary = await repairCoachRecurringSeriesGoogleSync(ctx.user.id)
    revalidateScheduling()
    return { success: true, summary }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not repair recurring session calendar sync.',
    }
  }
}

export type ResetRebookRecurringSeriesCalendarResult =
  | { success: true; summary: ResetRebookResult }
  | { success: false; error: string }

export async function resetAndRebookRecurringSeriesCalendar(): Promise<ResetRebookRecurringSeriesCalendarResult> {
  const ctx = await requireCoach()
  if (!ctx) {
    return { success: false, error: 'You must be signed in.' }
  }

  try {
    const summary = await resetAndRebookCoachRecurringSeries(ctx.user.id)
    revalidateScheduling()
    return { success: true, summary }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not reset and rebook recurring sessions.',
    }
  }
}
