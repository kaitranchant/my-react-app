'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { CalendarOff } from 'lucide-react'
import { toast } from 'sonner'

import { cancelCoachingAppointment } from '@/app/(dashboard)/scheduling/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClientCoachingTypeBadge } from '@/components/clients/client-coaching-type-badge'
import { coachingSessionTypeLabels } from '@/lib/coaching-session-types'
import { EmptyState } from '@/components/ui/empty-state'
import { formatAppointmentRange } from '@/lib/session-booking-slots'
import {
  appointmentStatusLabels,
  type ClientSessionPack,
  type CoachingAppointment,
} from '@/lib/session-booking-types'
import type { CoachPreferences } from '@/lib/coach-preferences'
import { cn } from '@/lib/utils'

type AppointmentsListProps = {
  appointments: CoachingAppointment[]
  coachPreferences: CoachPreferences
  sessionPacks?: ClientSessionPack[]
  showClient?: boolean
  allowClientCancel?: boolean
  onManage?: (appointment: CoachingAppointment) => void
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: LucideIcon
  emptyAction?: { label: string; href: string }
}

const statusVariant: Record<
  CoachingAppointment['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  scheduled: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
  no_show: 'outline',
  rescheduled: 'outline',
}

export function AppointmentsList({
  appointments,
  coachPreferences,
  showClient = true,
  allowClientCancel = false,
  onManage,
  emptyTitle,
  emptyDescription,
  emptyIcon: EmptyIcon = CalendarOff,
  emptyAction,
}: AppointmentsListProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = React.useState<string | null>(null)

  async function handleCancel(appointmentId: string) {
    setPendingId(appointmentId)
    const result = await cancelCoachingAppointment({ appointmentId })
    setPendingId(null)

    if (result.success) {
      toast.success('Appointment cancelled')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={EmptyIcon}
        title={
          emptyTitle ??
          (showClient
            ? 'No sessions scheduled'
            : 'No upcoming sessions')
        }
        description={
          emptyDescription ??
          (showClient
            ? 'Open availability or book a session to fill this week.'
            : 'Book a time below when your coach has slots open.')
        }
        action={emptyAction}
      />
    )
  }

  return (
    <ul className="divide-border divide-y rounded-lg border">
      {appointments.map((appointment) => {
        const isPending = pendingId === appointment.id
        const canClientCancel =
          allowClientCancel && appointment.status === 'scheduled'

        return (
          <li
            key={appointment.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {formatAppointmentRange(
                    appointment.starts_at,
                    appointment.ends_at,
                    coachPreferences.timezone
                  )}
                </p>
                <Badge variant={statusVariant[appointment.status]}>
                  {appointmentStatusLabels[appointment.status]}
                </Badge>
              </div>
              {showClient && appointment.client?.full_name ? (
                <p className="text-muted-foreground text-sm">
                  {appointment.client.full_name}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {appointment.location ? (
                  <span className="text-muted-foreground">{appointment.location}</span>
                ) : null}
                {appointment.session_type !== 'coaching' ? (
                  <Badge variant="outline" className="font-normal">
                    {coachingSessionTypeLabels[appointment.session_type]}
                  </Badge>
                ) : null}
                {appointment.coaching_type ? (
                  <ClientCoachingTypeBadge coachingType={appointment.coaching_type} />
                ) : null}
                {appointment.booked_by === 'client' ? (
                  <Badge variant="outline" className="font-normal">
                    Client booked
                  </Badge>
                ) : null}
              </div>
              {appointment.pre_session_notes ?? appointment.notes ? (
                <p className="text-muted-foreground text-sm">
                  {appointment.pre_session_notes ?? appointment.notes}
                </p>
              ) : null}
              {appointment.post_session_notes ? (
                <p className="text-muted-foreground text-sm italic">
                  Post: {appointment.post_session_notes}
                </p>
              ) : null}
            </div>

            {canClientCancel || onManage ? (
              <div className="flex shrink-0 flex-wrap gap-2">
                {canClientCancel ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleCancel(appointment.id)}
                  >
                    Cancel
                  </Button>
                ) : onManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    className={cn(isPending && 'opacity-60')}
                    onClick={() => onManage(appointment)}
                  >
                    Manage
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
