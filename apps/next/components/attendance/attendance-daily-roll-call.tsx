'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'

import {
  markAllClientsPresent,
  updateClientDailyAttendance,
} from '@/app/(dashboard)/attendance/actions'
import { AttendanceCoachingTypeSelect } from '@/components/attendance/attendance-coaching-type-select'
import { AttendanceNotesButton } from '@/components/attendance/attendance-notes-button'
import { AttendanceStatusSelect } from '@/components/attendance/attendance-status-select'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { ClientTeamBadges } from '@/components/teams/client-team-badges'
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
  computeClientAttendanceStats,
  formatMonthAttendanceSummary,
} from '@/lib/attendance-stats'
import {
  teamEventAttendanceLabels,
  teamEventRsvpLabels,
} from '@/lib/team-labels'
import type {
  AttendanceClientRow,
  ClientRsvpHint,
  DailyAttendanceRecord,
} from '@/lib/attendance'
import type { ClientAttendanceStats } from '@/lib/attendance-stats'
import type {
  ClientCoachingType,
  TeamEventAttendanceStatus,
} from 'app/types/database'

type AttendanceDailyRollCallProps = {
  date: string
  clients: AttendanceClientRow[]
  attendanceByClientId: Record<string, DailyAttendanceRecord>
  statsByClientId: Record<string, ClientAttendanceStats>
  rsvpHintsByClientId: Record<string, ClientRsvpHint>
  teamName?: string
}

export function AttendanceDailyRollCall({
  date,
  clients,
  attendanceByClientId,
  statsByClientId,
  rsvpHintsByClientId,
  teamName,
}: AttendanceDailyRollCallProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const counts = React.useMemo(() => {
    let present = 0
    let late = 0
    let absent = 0
    let excused = 0

    for (const client of clients) {
      const status = attendanceByClientId[client.id]?.status
      if (status === 'present') present += 1
      else if (status === 'late') late += 1
      else if (status === 'absent') absent += 1
      else if (status === 'excused') excused += 1
    }

    const unmarked = clients.length - present - late - absent - excused
    return { present, late, absent, excused, unmarked }
  }, [attendanceByClientId, clients])

  async function handleStatusChange(
    clientId: string,
    status: TeamEventAttendanceStatus | null
  ) {
    const existing = attendanceByClientId[clientId]
    setPending(true)
    const result = await updateClientDailyAttendance(clientId, date, status, {
      notes: existing?.notes ?? null,
      coachingType: existing?.coaching_type ?? null,
    })
    setPending(false)
    if (result.success) {
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleCoachingTypeChange(
    clientId: string,
    coachingType: ClientCoachingType | null
  ) {
    const existing = attendanceByClientId[clientId]
    if (!existing?.status) {
      toast.error('Set a status before changing training type.')
      return
    }

    setPending(true)
    const result = await updateClientDailyAttendance(
      clientId,
      date,
      existing.status,
      {
        notes: existing.notes,
        coachingType,
      }
    )
    setPending(false)
    if (result.success) {
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleMarkAllPresent() {
    if (clients.length === 0) return
    setPending(true)
    const result = await markAllClientsPresent(
      date,
      clients.map((client) => client.id)
    )
    setPending(false)
    if (result.success) {
      toast.success('All clients marked present')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">
              Daily roll call
            </CardTitle>
            <CardDescription>
              {teamName
                ? `Mark presence for ${teamName} members on the selected day.`
                : 'Mark client presence for the selected day.'}
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending || clients.length === 0}
            onClick={handleMarkAllPresent}
          >
            Mark all present
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="success">
            {counts.present} {teamEventAttendanceLabels.present.toLowerCase()}
          </Badge>
          <Badge variant="warning">
            {counts.late} {teamEventAttendanceLabels.late.toLowerCase()}
          </Badge>
          <Badge variant="destructive">
            {counts.absent} {teamEventAttendanceLabels.absent.toLowerCase()}
          </Badge>
          <Badge variant="secondary">
            {counts.excused} {teamEventAttendanceLabels.excused.toLowerCase()}
          </Badge>
          <Badge variant="outline">{counts.unmarked} unmarked</Badge>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 pt-4">
        {clients.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
            <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
              <ClipboardCheck className="text-muted-foreground/60 size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {teamName ? `No members on ${teamName}` : 'No active clients'}
              </p>
              <p className="text-xs leading-relaxed">
                {teamName
                  ? 'Add clients to this team from the team Members tab.'
                  : 'Adjust the scope filter or add clients to your roster.'}
              </p>
            </div>
            <Link
              href={teamName ? '/teams' : '/clients'}
              className="text-brand text-sm font-medium underline-offset-4 hover:underline"
            >
              {teamName ? 'View teams' : 'View clients'}
            </Link>
          </div>
        ) : (
          <ul className="divide-y">
            {clients.map((client) => {
              const record = attendanceByClientId[client.id]
              const stats =
                statsByClientId[client.id] ??
                computeClientAttendanceStats(new Map(), date)
              const rsvpHint = rsvpHintsByClientId[client.id]

              return (
                <li
                  key={client.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div className="flex min-w-0 items-start gap-3 sm:flex-1">
                    <ClientAvatar
                      name={client.full_name}
                      avatarUrl={client.avatar_url}
                      size="sm"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          href={`/clients/${client.id}`}
                          className="font-medium hover:underline"
                        >
                          {client.full_name}
                        </Link>
                        {stats.alertKind === 'consecutive_absences' && (
                          <Badge variant="destructive" className="text-[10px]">
                            {stats.consecutiveAbsences} missed
                          </Badge>
                        )}
                        {stats.alertKind === 'low_rate' && (
                          <Badge variant="warning" className="text-[10px]">
                            Low attendance
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                        <span>{formatMonthAttendanceSummary(stats)}</span>
                        {!teamName && client.memberships.length > 0 && (
                          <ClientTeamBadges memberships={client.memberships} />
                        )}
                      </div>
                      {rsvpHint && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          RSVP: {teamEventRsvpLabels[rsvpHint.rsvpStatus]} ·{' '}
                          {rsvpHint.eventTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pl-11 sm:shrink-0 sm:pl-0">
                    <AttendanceStatusSelect
                      value={record?.status ?? null}
                      onValueChange={(status) =>
                        handleStatusChange(client.id, status)
                      }
                      disabled={pending}
                    />
                    <AttendanceCoachingTypeSelect
                      value={record?.coaching_type ?? null}
                      defaultCoachingType={client.coaching_type}
                      onValueChange={(coachingType) =>
                        handleCoachingTypeChange(client.id, coachingType)
                      }
                      disabled={pending}
                    />
                    <AttendanceNotesButton
                      clientId={client.id}
                      date={date}
                      notes={record?.notes ?? null}
                      status={record?.status ?? null}
                      disabled={pending}
                      onSaved={() => router.refresh()}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
