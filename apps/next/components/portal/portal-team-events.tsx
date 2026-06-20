'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, MapPin } from 'lucide-react'
import { toast } from 'sonner'

import { updateMyTeamEventRsvp } from '@/app/portal/team-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ClientTeamEvent } from '@/lib/portal-teams'
import {
  formatTeamEventDate,
  teamEventRsvpLabels,
  teamEventTypeBadgeVariant,
  teamEventTypeLabels,
} from '@/lib/team-labels'
import { cn } from '@/lib/utils'
import type { TeamEventRsvpStatus } from 'app/types/database'

type PortalTeamEventsProps = {
  teamId: string
  events: ClientTeamEvent[]
}

const rsvpOptions: { value: TeamEventRsvpStatus; label: string }[] = [
  { value: 'going', label: 'Going' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'declined', label: "Can't make it" },
]

function EventCard({
  event,
  pending,
  onRsvp,
}: {
  event: ClientTeamEvent
  pending: boolean
  onRsvp: (eventId: string, status: TeamEventRsvpStatus) => void
}) {
  const currentRsvp = event.myStatus?.rsvp_status ?? 'no_response'

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={teamEventTypeBadgeVariant[event.event_type]}>
              {teamEventTypeLabels[event.event_type]}
            </Badge>
            {currentRsvp !== 'no_response' && (
              <Badge variant="outline">
                {teamEventRsvpLabels[currentRsvp]}
              </Badge>
            )}
          </div>
          <p className="font-medium">{event.title}</p>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <CalendarClock className="size-3.5 shrink-0" />
            {formatTeamEventDate(event.event_date, event.start_time)}
          </p>
          {event.location && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5 shrink-0" />
              {event.location}
            </p>
          )}
          {event.notes && (
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {event.notes}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {rsvpOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={currentRsvp === option.value ? 'default' : 'outline'}
            disabled={pending}
            className={cn(
              currentRsvp === option.value && 'pointer-events-none'
            )}
            onClick={() => onRsvp(event.id, option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </li>
  )
}

export function PortalTeamEvents({ teamId, events }: PortalTeamEventsProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const todayKey = new Date().toISOString().slice(0, 10)
  const upcoming = events
    .filter((event) => event.event_date >= todayKey)
    .sort((a, b) => {
      if (a.event_date !== b.event_date) {
        return a.event_date.localeCompare(b.event_date)
      }
      return (a.start_time ?? '').localeCompare(b.start_time ?? '')
    })
  const past = events
    .filter((event) => event.event_date < todayKey)
    .sort((a, b) => b.event_date.localeCompare(a.event_date))

  async function handleRsvp(eventId: string, rsvpStatus: TeamEventRsvpStatus) {
    setPending(true)
    const result = await updateMyTeamEventRsvp(teamId, eventId, rsvpStatus)
    setPending(false)

    if (result.success) {
      toast.success('RSVP updated')
      router.refresh()
      return
    }

    toast.error(result.error)
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b bg-muted/30 px-5 py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="size-4" />
          Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 px-5 py-5">
        {upcoming.length === 0 && past.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No team events scheduled yet.
          </p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Upcoming
                </p>
                <ul className="space-y-3">
                  {upcoming.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      pending={pending}
                      onRsvp={handleRsvp}
                    />
                  ))}
                </ul>
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Past
                </p>
                <ul className="space-y-3">
                  {past.slice(0, 5).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      pending={pending}
                      onRsvp={handleRsvp}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
