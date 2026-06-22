'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'

import { AttendanceStatusCell } from '@/components/attendance/attendance-status-select'
import { ClientAvatar } from '@/components/clients/client-avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { teamEventAttendanceLabels } from '@/lib/team-labels'
import type { AttendanceClientRow, DailyAttendanceRecord } from '@/lib/attendance'
import type { TeamEventAttendanceStatus } from 'app/types/database'

type WeekDay = {
  label: string
  dateKey: string
  isToday: boolean
}

type AttendanceWeeklyGridProps = {
  weekDays: WeekDay[]
  clients: AttendanceClientRow[]
  attendanceByClientIdAndDate: Record<
    string,
    Record<string, DailyAttendanceRecord>
  >
  teamName?: string
}

export function AttendanceWeeklyGrid({
  weekDays,
  clients,
  attendanceByClientIdAndDate,
  teamName,
}: AttendanceWeeklyGridProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function dailyLink(dateKey: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'daily')
    if (dateKey) {
      params.set('date', dateKey)
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  function statusForClientOnDate(
    clientId: string,
    dateKey: string
  ): TeamEventAttendanceStatus | null {
    return attendanceByClientIdAndDate[clientId]?.[dateKey]?.status ?? null
  }

  const legend = (
    <div className="flex flex-wrap gap-3 pt-2 text-xs">
      {(Object.keys(teamEventAttendanceLabels) as TeamEventAttendanceStatus[]).map(
        (status) => (
          <span key={status} className="text-muted-foreground inline-flex items-center gap-1.5">
            <AttendanceStatusCell status={status} className="size-4" />
            {teamEventAttendanceLabels[status]}
          </span>
        )
      )}
    </div>
  )

  return (
    <Card className="md:col-span-2">
      <CardHeader className="border-b pb-4">
        <CardTitle>Weekly summary</CardTitle>
        <CardDescription>
          {teamName
            ? `${teamName} attendance at a glance for the selected week.`
            : 'Client attendance at a glance for the selected week.'}
        </CardDescription>
        {legend}
      </CardHeader>
      <CardContent className="pt-4">
        {clients.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-center text-sm">
            <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
              <ClipboardCheck className="text-muted-foreground/60 size-5" />
            </div>
            <p className="font-medium text-foreground">No clients to display</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {clients.map((client) => (
                <Card key={client.id} className="py-0 shadow-none">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <ClientAvatar
                        name={client.full_name}
                        avatarUrl={client.avatar_url}
                        size="sm"
                      />
                      <Link
                        href={`/clients/${client.id}`}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {client.full_name}
                      </Link>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((day) => (
                        <Link
                          key={day.dateKey}
                          href={dailyLink(day.dateKey)}
                          className="flex flex-col items-center gap-1 rounded-md p-1 hover:bg-muted/60"
                          title={`Open ${day.dateKey} in daily view`}
                        >
                          <span className="text-muted-foreground text-[10px] font-medium">
                            {day.label.slice(0, 3)}
                          </span>
                          <AttendanceStatusCell
                            status={statusForClientOnDate(client.id, day.dateKey)}
                            className={day.isToday ? 'ring-brand/40 ring-2' : undefined}
                          />
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 min-w-[10rem] bg-card">
                      Client
                    </TableHead>
                    {weekDays.map((day) => (
                      <TableHead
                        key={day.dateKey}
                        className="min-w-[3rem] text-center"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{day.label}</span>
                          <span className="text-muted-foreground text-[10px] font-normal">
                            {day.dateKey.slice(8)}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="sticky left-0 z-10 bg-card">
                        <div className="flex items-center gap-2">
                          <ClientAvatar
                            name={client.full_name}
                            avatarUrl={client.avatar_url}
                            size="sm"
                          />
                          <Link
                            href={`/clients/${client.id}`}
                            className="truncate text-sm font-medium hover:underline"
                          >
                            {client.full_name}
                          </Link>
                        </div>
                      </TableCell>
                      {weekDays.map((day) => (
                        <TableCell key={day.dateKey} className="text-center">
                          <Link
                            href={dailyLink(day.dateKey)}
                            className="inline-flex justify-center"
                            title={`Open ${day.dateKey} in daily view`}
                          >
                            <AttendanceStatusCell
                              status={statusForClientOnDate(client.id, day.dateKey)}
                              className={day.isToday ? 'ring-brand/40 ring-2' : undefined}
                            />
                          </Link>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
