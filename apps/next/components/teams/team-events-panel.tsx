'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteTeamEvent,
  markAllTeamEventPresent,
  updateTeamEventMemberStatus,
} from '@/app/(dashboard)/teams/feature-actions'
import { CreateTeamEventDialog } from '@/components/teams/create-team-event-dialog'
import { TeamEventsCalendar } from '@/components/teams/team-events-calendar'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatTeamEventDate,
  teamEventAttendanceLabels,
  teamEventRsvpLabels,
  teamEventTypeBadgeVariant,
  teamEventTypeLabels,
} from '@/lib/team-labels'
import {
  teamEventAttendanceStatuses,
  teamEventRsvpStatuses,
} from '@/lib/validations/team'
import { cn } from '@/lib/utils'
import type {
  TeamEventAttendanceStatus,
  TeamEventRsvpStatus,
  TeamEventWithMemberStatus,
  TeamMemberWithClient,
} from 'app/types/database'

type TeamEventsPanelProps = {
  teamId: string
  events: TeamEventWithMemberStatus[]
  members: TeamMemberWithClient[]
  highlightDate?: string | null
}

function countByStatus(
  statuses: TeamEventWithMemberStatus['memberStatuses'],
  field: 'rsvp_status' | 'attendance_status',
  value: string
) {
  return statuses.filter((row) => row[field] === value).length
}

export function TeamEventsPanel({
  teamId,
  events,
  members,
  highlightDate = null,
}: TeamEventsPanelProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [viewMode, setViewMode] = React.useState<'list' | 'calendar'>('list')
  const [expandedEventId, setExpandedEventId] = React.useState<string | null>(
    null
  )
  const [calendarSelectedDate, setCalendarSelectedDate] = React.useState<
    string | null
  >(highlightDate)

  React.useEffect(() => {
    if (!highlightDate) return
    setCalendarSelectedDate(highlightDate)
    const match = events.find((event) => event.event_date === highlightDate)
    if (match) setExpandedEventId(match.id)
  }, [highlightDate, events])

  const todayKey = new Date().toISOString().slice(0, 10)
  const upcoming = events.filter((event) => event.event_date >= todayKey)
  const past = events.filter((event) => event.event_date < todayKey)

  async function handleDelete(eventId: string) {
    if (!window.confirm('Delete this event?')) return
    setPending(true)
    const result = await deleteTeamEvent(teamId, eventId)
    setPending(false)
    if (result.success) {
      toast.success('Event deleted')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleMarkAllPresent(eventId: string) {
    setPending(true)
    const result = await markAllTeamEventPresent(teamId, eventId)
    setPending(false)
    if (result.success) {
      toast.success('All members marked present')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleStatusChange(
    eventId: string,
    clientId: string,
    updates: {
      rsvpStatus?: TeamEventRsvpStatus
      attendanceStatus?: TeamEventAttendanceStatus | null
    }
  ) {
    setPending(true)
    const result = await updateTeamEventMemberStatus(teamId, eventId, {
      clientId,
      rsvpStatus: updates.rsvpStatus,
      attendanceStatus: updates.attendanceStatus,
    })
    setPending(false)
    if (result.success) {
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  function renderEventList(list: TeamEventWithMemberStatus[], label: string) {
    if (list.length === 0) return null

    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        <ul className="space-y-3">
          {list.map((event) => {
            const statuses = event.memberStatuses
            const goingCount = countByStatus(statuses, 'rsvp_status', 'going')
            const presentCount = countByStatus(
              statuses,
              'attendance_status',
              'present'
            )
            const expanded = expandedEventId === event.id

            return (
              <li
                key={event.id}
                className={cn(
                  'rounded-lg border',
                  highlightDate === event.event_date && 'border-brand ring-1 ring-brand/30'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{event.title}</p>
                      <Badge variant={teamEventTypeBadgeVariant[event.event_type]}>
                        {teamEventTypeLabels[event.event_type]}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {formatTeamEventDate(event.event_date, event.start_time)}
                    </p>
                    {event.location && (
                      <p className="text-muted-foreground text-sm">{event.location}</p>
                    )}
                    {event.notes && (
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                        {event.notes}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      RSVP: {goingCount} going · Attendance: {presentCount} present
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        setExpandedEventId(expanded ? null : event.id)
                      }
                    >
                      <ClipboardCheck className="size-4" />
                      {expanded ? 'Close' : 'RSVP & attendance'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => handleDelete(event.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-3 border-t bg-muted/20 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">Member responses</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={pending || members.length === 0}
                        onClick={() => handleMarkAllPresent(event.id)}
                      >
                        Mark all present
                      </Button>
                    </div>
                    {members.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Add team members to track RSVP and attendance.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {members.map((member) => {
                          const status =
                            statuses.find(
                              (row) => row.client_id === member.client_id
                            ) ?? null

                          return (
                            <li
                              key={member.client_id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <ClientAvatar
                                  name={member.client.full_name}
                                  avatarUrl={member.client.avatar_url}
                                  size="sm"
                                />
                                <span className="text-sm font-medium">
                                  {member.client.full_name}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Select
                                  value={status?.rsvp_status ?? 'no_response'}
                                  onValueChange={(value) =>
                                    handleStatusChange(event.id, member.client_id, {
                                      rsvpStatus: value as TeamEventRsvpStatus,
                                    })
                                  }
                                  disabled={pending}
                                >
                                  <SelectTrigger className="h-8 w-[8.5rem]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {teamEventRsvpStatuses.map((rsvp) => (
                                      <SelectItem key={rsvp} value={rsvp}>
                                        {teamEventRsvpLabels[rsvp]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Select
                                  value={status?.attendance_status ?? 'unset'}
                                  onValueChange={(value) =>
                                    handleStatusChange(event.id, member.client_id, {
                                      attendanceStatus:
                                        value === 'unset'
                                          ? null
                                          : (value as TeamEventAttendanceStatus),
                                    })
                                  }
                                  disabled={pending}
                                >
                                  <SelectTrigger className="h-8 w-[8.5rem]">
                                    <SelectValue placeholder="Attendance" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unset">Not logged</SelectItem>
                                    {teamEventAttendanceStatuses.map((attendance) => (
                                      <SelectItem
                                        key={attendance}
                                        value={attendance}
                                      >
                                        {teamEventAttendanceLabels[attendance]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
        <CardTitle className="text-sm font-medium">Team schedule</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-muted flex rounded-md p-0.5">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="h-7 px-2.5"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              className="h-7 px-2.5"
              onClick={() => setViewMode('calendar')}
            >
              Calendar
            </Button>
          </div>
          <CreateTeamEventDialog teamId={teamId} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6 px-5 py-5">
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No team events yet. Add practices, check-ins, mock meets, or
            competitions.
          </p>
        ) : viewMode === 'calendar' ? (
          <>
            <TeamEventsCalendar
              events={events}
              selectedDate={calendarSelectedDate}
              onSelectDate={(dateKey) => {
                setCalendarSelectedDate(dateKey)
                const match = events.find((event) => event.event_date === dateKey)
                setExpandedEventId(match?.id ?? null)
              }}
            />
            {calendarSelectedDate && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Events on{' '}
                  {new Date(`${calendarSelectedDate}T12:00:00`).toLocaleDateString()}
                </p>
                {renderEventList(
                  events.filter((event) => event.event_date === calendarSelectedDate),
                  'Selected day'
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {renderEventList(upcoming, 'Upcoming')}
            {renderEventList(past, 'Past')}
          </>
        )}
      </CardContent>
    </Card>
  )
}
