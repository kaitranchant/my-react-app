'use client'

import * as React from 'react'
import { Calendar, Loader2, Unplug } from 'lucide-react'
import { toast } from 'sonner'

import {
  disconnectGoogleCalendar,
  repairRecurringSeriesCalendarSync,
  updateGoogleCalendarSyncSettings,
} from '@/app/(dashboard)/scheduling/calendar-actions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import { RECONNECT_GOOGLE_CALENDAR_MESSAGE } from '@/lib/google-calendar/auth-errors'

const REPAIR_SYNC_TIMEOUT_MS = 60_000

async function withClientTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Calendar repair timed out. Please try again.')),
          timeoutMs
        )
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

type GoogleCalendarConnectCardProps = {
  configured: boolean
  connection: CoachGoogleCalendarConnection | null
  connectError?: string | null
  connectSuccess?: boolean
  authExpired?: boolean
}

function formatConnectError(code: string | null | undefined): string | null {
  if (!code) return null
  switch (code) {
    case 'google_calendar_not_configured':
      return 'Google Calendar is not configured on this environment yet.'
    case 'google_calendar_state_mismatch':
      return 'Google sign-in expired. Please try connecting again.'
    case 'google_calendar_session_mismatch':
      return 'Sign in as the same coach account to finish connecting Google Calendar.'
    case 'access_denied':
      return 'Google Calendar access was denied.'
    default:
      return 'Could not connect Google Calendar. Please try again.'
  }
}

export function GoogleCalendarConnectCard({
  configured,
  connection,
  connectError,
  connectSuccess = false,
  authExpired = false,
}: GoogleCalendarConnectCardProps) {
  const [repairPending, setRepairPending] = React.useState(false)
  const [disconnectPending, setDisconnectPending] = React.useState(false)
  const pending = repairPending || disconnectPending
  const [syncExportEnabled, setSyncExportEnabled] = React.useState(
    connection?.sync_export_enabled ?? true
  )
  const [syncBusyEnabled, setSyncBusyEnabled] = React.useState(
    connection?.sync_busy_enabled ?? true
  )

  React.useEffect(() => {
    if (connectSuccess) {
      toast.success('Google Calendar connected.')
    }
  }, [connectSuccess])

  React.useEffect(() => {
    const message = formatConnectError(connectError)
    if (message) {
      toast.error(message)
    }
  }, [connectError])

  React.useEffect(() => {
    setSyncExportEnabled(connection?.sync_export_enabled ?? true)
    setSyncBusyEnabled(connection?.sync_busy_enabled ?? true)
  }, [connection])

  async function handleRepairRecurringSync() {
    setRepairPending(true)
    try {
      const result = await withClientTimeout(
        repairRecurringSeriesCalendarSync(),
        REPAIR_SYNC_TIMEOUT_MS
      )
      if (!result.success) {
        toast.error(result.error)
        return
      }

      const { summary } = result
      const restoredMessage =
        summary.restoredAppointments > 0
          ? `${summary.restoredAppointments} session${
              summary.restoredAppointments === 1 ? '' : 's'
            } restored`
          : null
      const syncedMessage =
        summary.resyncedAppointments > 0
          ? `${summary.resyncedAppointments} session${
              summary.resyncedAppointments === 1 ? '' : 's'
            } synced to Google`
          : null
      const detail = [restoredMessage, syncedMessage].filter(Boolean).join(', ')

      if (result.reconnectRequired) {
        toast.warning(
          detail
            ? `${detail}. Reconnect Google Calendar to finish re-exporting sessions.`
            : RECONNECT_GOOGLE_CALENDAR_MESSAGE
        )
        return
      }

      toast.success(
        detail
          ? `Calendar sync repaired: ${detail}.`
          : 'Calendar sync repaired.'
      )
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not repair calendar sync.'
      )
    } finally {
      setRepairPending(false)
    }
  }

  async function handleDisconnect() {
    setDisconnectPending(true)
    try {
      const result = await withClientTimeout(
        disconnectGoogleCalendar(),
        15_000
      )
      if (result.success) {
        toast.success('Google Calendar disconnected.')
        return
      }
      toast.error(result.error)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not disconnect Google Calendar.'
      )
    } finally {
      setDisconnectPending(false)
    }
  }

  async function handleSyncSettingChange(
    field: 'syncExportEnabled' | 'syncBusyEnabled',
    value: boolean
  ) {
    const nextExport = field === 'syncExportEnabled' ? value : syncExportEnabled
    const nextBusy = field === 'syncBusyEnabled' ? value : syncBusyEnabled

    if (field === 'syncExportEnabled') setSyncExportEnabled(value)
    if (field === 'syncBusyEnabled') setSyncBusyEnabled(value)

    const result = await updateGoogleCalendarSyncSettings({
      syncExportEnabled: nextExport,
      syncBusyEnabled: nextBusy,
    })

    if (!result.success) {
      toast.error(result.error)
      setSyncExportEnabled(connection?.sync_export_enabled ?? true)
      setSyncBusyEnabled(connection?.sync_busy_enabled ?? true)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Calendar className="text-muted-foreground mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-medium">Google Calendar</p>
          <p className="text-muted-foreground text-sm">
            Export booked sessions to Google Calendar, sync edits back in real
            time, and block booking slots when your calendar is busy.
          </p>
        </div>
      </div>

      {!configured ? (
        <p className="text-muted-foreground text-sm">
          Google Calendar sync is not configured for this environment. Add{' '}
          <span className="font-mono">GOOGLE_CALENDAR_CLIENT_ID</span> and{' '}
          <span className="font-mono">GOOGLE_CALENDAR_CLIENT_SECRET</span> to
          enable it.
        </p>
      ) : connection ? (
        <div className="space-y-4">
          {authExpired ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm">
              <p className="font-medium text-amber-950 dark:text-amber-100">
                Google Calendar authorization expired
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                SwiftCoach cannot read or export calendar events until you
                reconnect. Sessions already in SwiftCoach can be restored with
                Repair calendar sync after reconnecting.
              </p>
              <Button type="button" className="mt-3" asChild>
                <a href="/api/calendar/google/connect">Reconnect Google Calendar</a>
              </Button>
            </div>
          ) : null}

          <div className="bg-muted/40 rounded-md px-3 py-2 text-sm">
            Connected as{' '}
            <span className="font-medium">{connection.google_email}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="google-sync-export">Export sessions</Label>
                <p className="text-muted-foreground text-xs">
                  New and updated coaching appointments appear on your Google
                  Calendar.
                </p>
              </div>
              <Select
                value={syncExportEnabled ? 'yes' : 'no'}
                onValueChange={(value) =>
                  handleSyncSettingChange('syncExportEnabled', value === 'yes')
                }
                disabled={pending}
              >
                <SelectTrigger id="google-sync-export" className="w-[7.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">On</SelectItem>
                  <SelectItem value="no">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="google-sync-busy">Block busy times</Label>
                <p className="text-muted-foreground text-xs">
                  Existing Google Calendar events prevent client booking and
                  appear as blocked time on your schedule.
                </p>
              </div>
              <Select
                value={syncBusyEnabled ? 'yes' : 'no'}
                onValueChange={(value) =>
                  handleSyncSettingChange('syncBusyEnabled', value === 'yes')
                }
                disabled={pending}
              >
                <SelectTrigger id="google-sync-busy" className="w-[7.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">On</SelectItem>
                  <SelectItem value="no">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-dashed px-3 py-3">
            <p className="text-sm font-medium">Fix calendar sync</p>
            <p className="text-muted-foreground text-xs">
              Cleans duplicate Google Calendar events, restores sessions removed
              by sync mistakes, refills the rolling schedule, and re-exports
              any sessions missing from Google Calendar.
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={pending || !syncExportEnabled}
              onClick={() => void handleRepairRecurringSync()}
            >
              {repairPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Calendar className="size-4" />
              )}
              Repair calendar sync
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void handleDisconnect()}
          >
            {disconnectPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Unplug className="size-4" />
            )}
            Disconnect Google Calendar
          </Button>
        </div>
      ) : (
        <Button type="button" asChild>
          <a href="/api/calendar/google/connect">Connect Google Calendar</a>
        </Button>
      )}
    </div>
  )
}
