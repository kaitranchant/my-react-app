import { Suspense } from 'react'

import { AttendanceDailyRollCall } from '@/components/attendance/attendance-daily-roll-call'
import { AttendanceDateNav } from '@/components/attendance/attendance-date-nav'
import { AttendanceScopeTabs } from '@/components/attendance/attendance-scope-tabs'
import { AttendanceTeamEventsSection } from '@/components/attendance/attendance-team-events-section'
import { AttendanceWeeklyGrid } from '@/components/attendance/attendance-weekly-grid'
import {
  ClearPageFilters,
  PageFilterPersistence,
} from '@/components/filters/page-filter-persistence'
import { PageHeader } from '@/components/dashboard/page-header'
import { computeClientAttendanceStats } from '@/lib/attendance-stats'
import {
  buildClientRsvpHintsByClientId,
  fetchAttendanceClients,
  fetchClientAttendanceHistory,
  fetchCoachTeamEventsForDate,
  fetchCoachTeams,
  fetchDailyAttendanceForDate,
  fetchDailyAttendanceForDateRange,
  fetchTeamMembersByTeamIds,
  isValidAttendanceDate,
  parseAttendanceScope,
  type DailyAttendanceRecord,
} from '@/lib/attendance'
import { getWeekDayLabels, parseDateKey } from '@/lib/calendar'
import { getCoachDateKey } from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { getGymsForCoach } from '@/lib/gym-access'
import { createClient } from '@/lib/supabase/server'
import { parseAttendanceViewMode } from '@/lib/validations/attendance'
import type { ClientAttendanceStats } from '@/lib/attendance-stats'

export const metadata = {
  title: 'Attendance — Coaching App',
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string
    scope?: string
    team?: string
    view?: string
  }>
}) {
  const {
    date: dateParam,
    scope: scopeParam,
    team: teamParam,
    view: viewParam,
  } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const coachPreferences = user
    ? await getCoachPreferencesForUser(user.id)
    : null
  const today = getCoachDateKey(coachPreferences?.timezone ?? 'auto')
  const date = isValidAttendanceDate(dateParam) ? dateParam : today
  const view = parseAttendanceViewMode(viewParam)
  const weekStartsOn = coachPreferences?.weekStartsOn ?? 'monday'

  const coachGyms = user ? await getGymsForCoach(user.id) : []
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
  const coachTeams = user ? await fetchCoachTeams(supabase, user.id) : []
  const scope = parseAttendanceScope(
    scopeParam,
    teamParam,
    coachGymIds,
    coachGyms,
    coachTeams
  )
  const selectedTeamName = scope.teamId
    ? coachTeams.find((team) => team.id === scope.teamId)?.name
    : undefined

  const [events, clients] = await Promise.all([
    user
      ? fetchCoachTeamEventsForDate(supabase, user.id, date, scope)
      : Promise.resolve([]),
    user
      ? fetchAttendanceClients(supabase, {
          scope,
          coachGymIds,
          userId: user.id,
        })
      : Promise.resolve([]),
  ])

  const clientIds = clients.map((client) => client.id)
  const weekDays = getWeekDayLabels(weekStartsOn, parseDateKey(date))
  const weekStart = weekDays[0]?.dateKey ?? date
  const weekEnd = weekDays[6]?.dateKey ?? date
  const monthStart = `${date.slice(0, 7)}-01`

  const teamIds = Array.from(
    new Set([
      ...events.map((event) => event.team_id),
      ...(scope.teamId ? [scope.teamId] : []),
    ])
  )

  const [
    membersByTeamIdMap,
    attendanceMap,
    weeklyAttendanceMap,
    historyMap,
  ] = await Promise.all([
    fetchTeamMembersByTeamIds(supabase, teamIds),
    fetchDailyAttendanceForDate(supabase, date, clientIds),
    view === 'weekly'
      ? fetchDailyAttendanceForDateRange(
          supabase,
          weekStart,
          weekEnd,
          clientIds
        )
      : Promise.resolve(new Map()),
    fetchClientAttendanceHistory(
      supabase,
      clientIds,
      monthStart,
      date
    ),
  ])

  const membersByTeamId = Object.fromEntries(membersByTeamIdMap)
  const attendanceByClientId = Object.fromEntries(attendanceMap) as Record<
    string,
    DailyAttendanceRecord
  >

  const attendanceByClientIdAndDate: Record<
    string,
    Record<string, DailyAttendanceRecord>
  > = {}
  for (const [clientId, recordsByDate] of Array.from(weeklyAttendanceMap.entries())) {
    attendanceByClientIdAndDate[clientId] = Object.fromEntries(recordsByDate)
  }

  const statsByClientId: Record<string, ClientAttendanceStats> = {}
  for (const client of clients) {
    const recordsByDate = historyMap.get(client.id) ?? new Map()
    statsByClientId[client.id] = computeClientAttendanceStats(
      recordsByDate,
      date
    )
  }

  const rsvpHintsByClientId = Object.fromEntries(
    buildClientRsvpHintsByClientId(events)
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Attendance"
        description="Mark daily client presence, review weekly patterns, and manage team event roll call."
      />

      <AttendanceDateNav
        date={date}
        today={today}
        view={view}
        weekStartsOn={weekStartsOn}
      />

      <Suspense fallback={null}>
        <PageFilterPersistence
          pageKey="attendance"
          filterKeys={['scope', 'team', 'view']}
        />
        <div className="space-y-3">
          <AttendanceScopeTabs gyms={coachGyms} teams={coachTeams} />
          <ClearPageFilters
            pageKey="attendance"
            filterKeys={['scope', 'team']}
          />
        </div>
      </Suspense>

      {view === 'weekly' ? (
        <AttendanceWeeklyGrid
          weekDays={weekDays}
          clients={clients}
          attendanceByClientIdAndDate={attendanceByClientIdAndDate}
          teamName={selectedTeamName}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {scope.teamId ? (
            <AttendanceTeamEventsSection
              date={date}
              events={events}
              membersByTeamId={membersByTeamId}
              teamName={selectedTeamName}
            />
          ) : null}
          <AttendanceDailyRollCall
            date={date}
            clients={clients}
            attendanceByClientId={attendanceByClientId}
            statsByClientId={statsByClientId}
            rsvpHintsByClientId={rsvpHintsByClientId}
            teamName={selectedTeamName}
          />
        </div>
      )}
    </div>
  )
}
