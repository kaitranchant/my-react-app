import Link from 'next/link'
import { ArrowRight, CalendarClock } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ClientNextTeamEvent } from '@/lib/portal-teams'
import {
  formatTeamEventDate,
  teamEventRsvpLabels,
  teamEventTypeBadgeVariant,
  teamEventTypeLabels,
} from '@/lib/team-labels'

type PortalNextTeamEventCardProps = {
  nextEvent: ClientNextTeamEvent
}

export function PortalNextTeamEventCard({
  nextEvent,
}: PortalNextTeamEventCardProps) {
  const { teamId, teamName, event, myRsvpStatus } = nextEvent

  return (
    <Link href={`/portal/team?team=${teamId}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-brand/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
            <span className="flex items-center gap-2">
              <CalendarClock className="text-brand size-5" />
              Team event
            </span>
            {myRsvpStatus !== 'no_response' && (
              <Badge variant="outline">{teamEventRsvpLabels[myRsvpStatus]}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium">{teamName}</p>
          <p className="font-medium">{event.title}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={teamEventTypeBadgeVariant[event.event_type]}>
              {teamEventTypeLabels[event.event_type]}
            </Badge>
            <span className="text-muted-foreground">
              {formatTeamEventDate(event.event_date, event.start_time)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8 gap-1 px-0 text-xs group-hover:text-brand"
            tabIndex={-1}
          >
            View team & RSVP
            <ArrowRight className="size-3.5" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}
