'use client'

import * as React from 'react'
import { toast } from 'sonner'

import {
  clearGoogleEventMarker,
  upsertGoogleEventMarker,
} from '@/app/(dashboard)/scheduling/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type {
  GoogleCalendarBlockedTime,
  GoogleEventMarkerStatus,
} from '@/lib/google-calendar/blocked-times-filter'
import { formatAppointmentRange } from '@/lib/session-booking-slots'
import { appointmentStatusLabels } from '@/lib/session-booking-types'

type GoogleEventStatusDialogProps = {
  blockedTime: GoogleCalendarBlockedTime | null
  open: boolean
  onOpenChange: (open: boolean) => void
  coachPreferences: CoachPreferences
  onStatusChanged?: (
    googleEventId: string,
    status: GoogleEventMarkerStatus | null
  ) => void
}

const markerActions: Array<{
  status: GoogleEventMarkerStatus
  label: string
  variant?: 'default' | 'outline' | 'destructive'
}> = [
  { status: 'completed', label: 'Mark completed' },
  { status: 'no_show', label: 'Mark no show', variant: 'outline' },
  { status: 'cancelled', label: 'Mark cancelled', variant: 'destructive' },
]

export function GoogleEventStatusDialog({
  blockedTime,
  open,
  onOpenChange,
  coachPreferences,
  onStatusChanged,
}: GoogleEventStatusDialogProps) {
  const [pending, setPending] = React.useState(false)

  if (!blockedTime) {
    return null
  }

  async function handleStatus(status: GoogleEventMarkerStatus) {
    setPending(true)
    const result = await upsertGoogleEventMarker({
      googleEventId: blockedTime!.id,
      status,
    })
    setPending(false)

    if (result.success) {
      onStatusChanged?.(blockedTime!.id, status)
      toast.success(`Marked ${appointmentStatusLabels[status].toLowerCase()}`)
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
  }

  async function handleClear() {
    setPending(true)
    const result = await clearGoogleEventMarker({
      googleEventId: blockedTime!.id,
    })
    setPending(false)

    if (result.success) {
      onStatusChanged?.(blockedTime!.id, null)
      toast.success('Status cleared')
      onOpenChange(false)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{blockedTime.title}</DialogTitle>
          <DialogDescription>
            {formatAppointmentRange(
              blockedTime.startsAt,
              blockedTime.endsAt,
              coachPreferences.timezone
            )}
            {' · Google Calendar'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {blockedTime.status
                ? appointmentStatusLabels[blockedTime.status]
                : 'No status'}
            </Badge>
            <p className="text-muted-foreground text-sm">
              Visual marker only — does not create a SwiftCoach session.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {markerActions.map((action) => (
              <Button
                key={action.status}
                type="button"
                size="sm"
                variant={action.variant ?? 'default'}
                disabled={pending || blockedTime.status === action.status}
                onClick={() => void handleStatus(action.status)}
              >
                {action.label}
              </Button>
            ))}
          </div>

          {blockedTime.status ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => void handleClear()}
            >
              Clear status
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
