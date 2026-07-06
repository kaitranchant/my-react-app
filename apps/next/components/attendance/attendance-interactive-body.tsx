'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

import { loadAttendanceDateData } from '@/app/(dashboard)/attendance/actions'
import { AttendanceDailyRollCall } from '@/components/attendance/attendance-daily-roll-call'
import { AttendanceDateSkeleton } from '@/components/attendance/attendance-date-skeleton'
import { AttendanceTeamEventsSection } from '@/components/attendance/attendance-team-events-section'
import { AttendanceWeeklyGrid } from '@/components/attendance/attendance-weekly-grid'
import { isValidAttendanceDate } from '@/lib/attendance'
import type {
  AttendanceDateData,
  AttendanceScopeData,
} from '@/lib/attendance-page-data'
import type { AttendanceViewMode } from '@/lib/validations/attendance'
import { parseAttendanceViewMode } from '@/lib/validations/attendance'
import type { WeekStartsOn } from 'app/types/database'

type AttendanceInteractiveBodyProps = {
  scopeData: AttendanceScopeData
  initialDateData: AttendanceDateData
  date: string
  view: AttendanceViewMode
  weekStartsOn: WeekStartsOn
  userId: string
  today: string
}

function dateViewKey(date: string, view: AttendanceViewMode) {
  return `${date}|${view}`
}

export function AttendanceInteractiveBody({
  scopeData,
  initialDateData,
  date: serverDate,
  view: serverView,
  weekStartsOn,
  userId,
  today,
}: AttendanceInteractiveBodyProps) {
  const searchParams = useSearchParams()
  const urlDate = isValidAttendanceDate(searchParams.get('date') ?? undefined)
    ? (searchParams.get('date') as string)
    : today
  const urlView = parseAttendanceViewMode(searchParams.get('view') ?? undefined)

  const [dateData, setDateData] = React.useState(initialDateData)
  const [loading, setLoading] = React.useState(false)
  const loadedKeyRef = React.useRef(dateViewKey(serverDate, serverView))
  const scopeKeyRef = React.useRef(
    JSON.stringify({
      scope: scopeData.scope,
      clientIds: scopeData.clients.map((client) => client.id),
    })
  )

  React.useEffect(() => {
    const nextScopeKey = JSON.stringify({
      scope: scopeData.scope,
      clientIds: scopeData.clients.map((client) => client.id),
    })
    const requestKey = dateViewKey(urlDate, urlView)
    const serverKey = dateViewKey(serverDate, serverView)

    if (nextScopeKey !== scopeKeyRef.current) {
      scopeKeyRef.current = nextScopeKey
      setDateData(initialDateData)
      loadedKeyRef.current = serverKey
      return
    }

    if (requestKey === serverKey && requestKey === loadedKeyRef.current) {
      setDateData(initialDateData)
      return
    }

    if (requestKey === loadedKeyRef.current) {
      return
    }

    let cancelled = false
    setLoading(true)

    void loadAttendanceDateData({
      date: urlDate,
      view: urlView,
      weekStartsOn,
      scopeData,
      userId,
    })
      .then((data) => {
        if (cancelled) return
        setDateData(data)
        loadedKeyRef.current = requestKey
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    initialDateData,
    scopeData,
    serverDate,
    serverView,
    urlDate,
    urlView,
    userId,
    weekStartsOn,
  ])

  const content =
    urlView === 'weekly' ? (
      <AttendanceWeeklyGrid
        weekDays={dateData.weekDays}
        clients={scopeData.clients}
        attendanceByClientIdAndDate={dateData.attendanceByClientIdAndDate}
        teamName={scopeData.selectedTeamName}
      />
    ) : (
      <div className="flex flex-col gap-8">
        {scopeData.scope.teamId ? (
          <AttendanceTeamEventsSection
            date={urlDate}
            events={dateData.events}
            membersByTeamId={scopeData.membersByTeamId}
            teamName={scopeData.selectedTeamName}
          />
        ) : null}
        <AttendanceDailyRollCall
          date={urlDate}
          clients={scopeData.clients}
          attendanceByClientId={dateData.attendanceByClientId}
          statsByClientId={dateData.statsByClientId}
          rsvpHintsByClientId={dateData.rsvpHintsByClientId}
          teamName={scopeData.selectedTeamName}
        />
      </div>
    )

  return (
    <div className="relative">
      {loading ? (
        <div className="absolute inset-0 z-10 bg-background/60">
          <AttendanceDateSkeleton />
        </div>
      ) : null}
      <div className={loading ? 'pointer-events-none opacity-60' : undefined}>
        {content}
      </div>
    </div>
  )
}
