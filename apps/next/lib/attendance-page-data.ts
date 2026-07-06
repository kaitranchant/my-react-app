import type { SupabaseClient } from '@supabase/supabase-js'

import { computeClientAttendanceStats } from '@/lib/attendance-stats'
import {
  buildClientRsvpHintsByClientId,
  attendanceScopeToParams,
  fetchAttendanceClients,
  fetchClientAttendanceHistory,
  fetchCoachTeamEventsForDate,
  fetchDailyAttendanceForDate,
  fetchDailyAttendanceForDateRange,
  fetchTeamMembersByTeamIds,
  parseAttendanceScope,
  type AttendanceClientRow,
  type AttendanceScope,
  type CoachTeam,
  type DailyAttendanceRecord,
} from '@/lib/attendance'
import { getWeekDayLabels, parseDateKey } from '@/lib/calendar'
import type { ClientAttendanceStats } from '@/lib/attendance-stats'
import type { TeamEventWithTeamContext, TeamMemberWithClient } from 'app/types/database'
import type { AttendanceViewMode } from '@/lib/validations/attendance'
import type { WeekStartsOn } from 'app/types/database'

export type AttendanceScopeData = {
  clients: AttendanceClientRow[]
  scope: AttendanceScope
  selectedTeamName?: string
  membersByTeamId: Record<string, TeamMemberWithClient[]>
}

export type AttendanceDateData = {
  weekDays: ReturnType<typeof getWeekDayLabels>
  events: TeamEventWithTeamContext[]
  attendanceByClientId: Record<string, DailyAttendanceRecord>
  attendanceByClientIdAndDate: Record<string, Record<string, DailyAttendanceRecord>>
  statsByClientId: Record<string, ClientAttendanceStats>
  rsvpHintsByClientId: Record<string, import('@/lib/attendance').ClientRsvpHint>
}

type SharedFetchOptions = {
  supabase: SupabaseClient
  userId: string
  coachGyms: { id: string; name: string }[]
  coachTeams: CoachTeam[]
  scopeParam?: string
  teamParam?: string
}

export async function fetchAttendanceScopeData({
  supabase,
  userId,
  coachGyms,
  coachTeams,
  scopeParam,
  teamParam,
}: SharedFetchOptions): Promise<AttendanceScopeData> {
  const coachGymIds = new Set(coachGyms.map((gym) => gym.id))
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

  const clients = await fetchAttendanceClients(supabase, {
    scope,
    coachGymIds,
    userId,
  })

  const teamIds = scope.teamId ? [scope.teamId] : []
  const membersByTeamIdMap =
    teamIds.length > 0
      ? await fetchTeamMembersByTeamIds(supabase, teamIds)
      : new Map()

  return {
    clients,
    scope,
    selectedTeamName,
    membersByTeamId: Object.fromEntries(membersByTeamIdMap),
  }
}

export async function fetchAttendanceDateData({
  supabase,
  userId,
  date,
  view,
  weekStartsOn,
  scopeData,
}: {
  supabase: SupabaseClient
  userId: string
  date: string
  view: AttendanceViewMode
  weekStartsOn: WeekStartsOn
  scopeData: AttendanceScopeData
}): Promise<AttendanceDateData> {
  const { clients, scope } = scopeData
  const clientIds = clients.map((client) => client.id)
  const weekDays = getWeekDayLabels(weekStartsOn, parseDateKey(date))
  const weekStart = weekDays[0]?.dateKey ?? date
  const weekEnd = weekDays[6]?.dateKey ?? date
  const monthStart = `${date.slice(0, 7)}-01`

  if (view === 'weekly') {
    const weeklyAttendanceMap = await fetchDailyAttendanceForDateRange(
      supabase,
      weekStart,
      weekEnd,
      clientIds
    )

    const attendanceByClientIdAndDate: Record<
      string,
      Record<string, DailyAttendanceRecord>
    > = {}
    for (const [clientId, recordsByDate] of Array.from(
      weeklyAttendanceMap.entries()
    )) {
      attendanceByClientIdAndDate[clientId] = Object.fromEntries(recordsByDate)
    }

    return {
      weekDays,
      events: [],
      attendanceByClientId: {},
      attendanceByClientIdAndDate,
      statsByClientId: {},
      rsvpHintsByClientId: {},
    }
  }

  const [events, attendanceMap, historyMap] = await Promise.all([
    fetchCoachTeamEventsForDate(supabase, userId, date, scope),
    fetchDailyAttendanceForDate(supabase, date, clientIds),
    fetchClientAttendanceHistory(supabase, clientIds, monthStart, date),
  ])

  const statsByClientId: Record<string, ClientAttendanceStats> = {}
  for (const client of clients) {
    const recordsByDate = historyMap.get(client.id) ?? new Map()
    statsByClientId[client.id] = computeClientAttendanceStats(
      recordsByDate,
      date
    )
  }

  return {
    weekDays,
    events,
    attendanceByClientId: Object.fromEntries(attendanceMap),
    attendanceByClientIdAndDate: {},
    statsByClientId,
    rsvpHintsByClientId: Object.fromEntries(
      buildClientRsvpHintsByClientId(events)
    ),
  }
}

export function attendanceScopeSuspenseKey(params: {
  scope?: string
  team?: string
  view?: string
}) {
  return [
    params.scope ?? 'all',
    params.team ?? '',
    params.view ?? 'daily',
  ].join('|')
}

export function attendanceDateSuspenseKey(params: {
  date?: string
  view?: string
}) {
  return [params.date ?? '', params.view ?? 'daily'].join('|')
}

/** @deprecated Use attendanceScopeSuspenseKey + attendanceDateSuspenseKey */
export function attendanceContentSuspenseKey(params: {
  date?: string
  scope?: string
  team?: string
  view?: string
}) {
  return [
    params.date ?? '',
    params.scope ?? 'all',
    params.team ?? '',
    params.view ?? 'daily',
  ].join('|')
}

export function buildAttendanceHref(
  pathname: string,
  searchParams: URLSearchParams,
  updates: {
    scope?: AttendanceScope
    view?: AttendanceViewMode | null
    date?: string | null
  }
) {
  const params = new URLSearchParams(searchParams.toString())

  if (updates.scope) {
    const { scope: scopeParam, team: teamParam } = attendanceScopeToParams(
      updates.scope
    )
    if (scopeParam) {
      params.set('scope', scopeParam)
    } else {
      params.delete('scope')
    }
    if (teamParam) {
      params.set('team', teamParam)
    } else {
      params.delete('team')
    }
  }

  if (updates.view !== undefined) {
    if (updates.view === null || updates.view === 'daily') {
      params.delete('view')
    } else {
      params.set('view', updates.view)
    }
  }

  if (updates.date !== undefined) {
    if (updates.date === null) {
      params.delete('date')
    } else {
      params.set('date', updates.date)
    }
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
