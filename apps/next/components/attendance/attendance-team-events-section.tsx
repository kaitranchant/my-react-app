'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'

import {
  markAllTeamEventPresent,
  updateTeamEventMemberStatus,
} from '@/app/(dashboard)/teams/feature-actions'
import { AttendanceStatusSelect } from '@/components/attendance/attendance-status-select'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
  teamEventRsvpLabels,
  teamEventTypeBadgeVariant,
  teamEventTypeLabels,
} from '@/lib/team-labels'
import { teamEventRsvpStatuses } from '@/lib/validations/team'
import { cn } from '@/lib/utils'
import type {
  TeamEventAttendanceStatus,
  TeamEventRsvpStatus,
  TeamEventWithTeamContext,
  TeamMemberWithClient,
} from 'app/types/database'

type AttendanceTeamEventsSectionProps = {
  date: string
  events: TeamEventWithTeamContext[]
  membersByTeamId: Record<string, TeamMemberWithClient[]>
  teamName?: string
}

function countByStatus(
  statuses: TeamEventWithTeamContext['memberStatuses'],
  field: 'rsvp_status' | 'attendance_status',
  value: string
) {
  return statuses.filter((row) => row[field] === value).length
}

export function AttendanceTeamEventsSection({
  date,
  events,
  membersByTeamId,
  teamName,
}: AttendanceTeamEventsSectionProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [expandedEventId, setExpandedEventId] = React.useState<string | null>(
    null
  )

  async function handleStatusChange(
    teamId: string,
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

  async function handleMarkAllPresent(teamId: string, eventId: string) {
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

  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base font-semibold">Team events</CardTitle>
        <CardDescription>
          {teamName
            ? `Roll call for ${teamName} events scheduled on this day.`
            : 'Roll call for team events scheduled on this day.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {events.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
            <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
              <CalendarDays className="text-muted-foreground/60 size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">No team events</p>
              <p className="text-xs leading-relaxed">
                {teamName
                  ? `Create events for ${teamName} from the team Schedule tab.`
                  : 'Create events from a team\'s Schedule tab to track RSVP and attendance here.'}
              </p>
            </div>
            <Link
              href="/teams"
              className="text-brand text-sm font-medium underline-offset-4 hover:underline"
            >
              View teams
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => {
              const members = membersByTeamId[event.team_id] ?? []
              const statuses = event.memberStatuses
              const goingCount = countByStatus(statuses, 'rsvp_status', 'going')
              const presentCount =
                countByStatus(statuses, 'attendance_status', 'present') +
                countByStatus(statuses, 'attendance_status', 'late')
              const expanded = expandedEventId === event.id

              return (
                <li key={event.id} className="rounded-lg border">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{event.title}</p>
                        <Badge variant="outline">{event.team.name}</Badge>
                        <Badge variant={teamEventTypeBadgeVariant[event.event_type]}>
                          {teamEventTypeLabels[event.event_type]}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {formatTeamEventDate(event.event_date, event.start_time)}
                      </p>
                      {event.location && (
                        <p className="text-muted-foreground text-sm">
                          {event.location}
                        </p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        RSVP: {goingCount} going · Attendance: {presentCount}{' '}
                        present/late
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
                        {expanded ? 'Close' : 'Roll call'}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <Link
                          href={`/teams/${event.team_id}?tab=schedule&date=${date}`}
                        >
                          Open team
                        </Link>
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
                          onClick={() =>
                            handleMarkAllPresent(event.team_id, event.id)
                          }
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
                                className={cn(
                                  'flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-3 py-2'
                                )}
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
                                      handleStatusChange(
                                        event.team_id,
                                        event.id,
                                        member.client_id,
                                        {
                                          rsvpStatus:
                                            value as TeamEventRsvpStatus,
                                        }
                                      )
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
                                  <AttendanceStatusSelect
                                    value={status?.attendance_status ?? null}
                                    onValueChange={(value) =>
                                      handleStatusChange(
                                        event.team_id,
                                        event.id,
                                        member.client_id,
                                        { attendanceStatus: value }
                                      )
                                    }
                                    disabled={pending}
                                  />
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
        )}
      </CardContent>
    </Card>
  )
}
