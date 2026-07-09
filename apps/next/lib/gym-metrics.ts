import {
  fetchAttendanceClients,
  fetchClientAttendanceHistory,
  type AttendanceClientRow,
} from '@/lib/attendance'
import { computeClientAttendanceStats } from '@/lib/attendance-stats'
import {
  buildComplianceSummary,
  type ComplianceClientRow,
} from '@/lib/compliance'
import { fetchComplianceDashboardRows } from '@/lib/compliance-queries'
import {
  getCheckInPeriodBounds,
  getCheckInPeriodLabel,
} from '@/lib/check-in-cadence'
import {
  defaultCoachPreferences,
  getCoachDateKey,
  getWeekRange,
} from '@/lib/coach-preferences'
import type { createClient } from '@/lib/supabase/server'
import {
  ensureGymMemberCoachProfiles,
  fetchGymMemberCoachClients,
} from '@/lib/gym-coach-client'
import type { GymMemberWithProfile } from 'app/types/database'

export type GymCoachMetrics = {
  coachId: string
  coachName: string
  activeClients: number
  attendanceRate: number | null
  sessionCompletionRate: number | null
  clientsNeedingAttention: number
  elevatedLoadClients: number
  injuryFlagClients: number
}

export type GymOwnerDashboardSummary = {
  totalActiveClients: number
  totalCoaches: number
  attendanceRate: number | null
  sessionCompletionRate: number | null
  clientsNeedingAttention: number
  elevatedLoadClients: number
  injuryFlagClients: number
  monthLabel: string
}

export type GymClientListItem = {
  clientId: string
  clientName: string
  avatarUrl: string | null
  coachId: string
  coachName: string
  coachAvatarUrl: string | null
  attendanceRate: number | null
  sessionCompletion: { completed: number; planned: number } | null
  issueCount: number
  isGymCoachMember?: boolean
}

export type GymOwnerDashboard = {
  summary: GymOwnerDashboardSummary
  coaches: GymCoachMetrics[]
  clients: GymClientListItem[]
  hasSharedClients: boolean
  selectedCoachId: string | null
}

type ClientCoachRow = {
  id: string
  coach_id: string
}

type GymClientMetricsContext = {
  clients: AttendanceClientRow[]
  clientCoachRows: ClientCoachRow[]
  complianceByClientId: Map<string, ComplianceClientRow>
  attendanceStatsByClientId: Map<
    string,
    { monthAttended: number; monthTotal: number }
  >
  coachSelfClientIds: Set<string>
}

async function fetchGymClientMetricsContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    gymId: string
    coachId: string
    coachGymIds: Set<string>
    members: GymMemberWithProfile[]
    coachPreferences?: typeof defaultCoachPreferences
  }
): Promise<GymClientMetricsContext> {
  const preferences = options.coachPreferences ?? defaultCoachPreferences
  const todayKey = getCoachDateKey(preferences.timezone)
  const monthStart = `${todayKey.slice(0, 7)}-01`

  const { start: weekStart, end: weekEnd } = getWeekRange(
    preferences.weekStartsOn,
    preferences.timezone
  )
  const { start: checkInPeriodStart, end: checkInPeriodEnd } =
    getCheckInPeriodBounds(
      preferences.defaultCheckInFrequency,
      preferences.weekStartsOn,
      preferences.timezone
    )
  const checkInPeriodLabel = getCheckInPeriodLabel(
    preferences.defaultCheckInFrequency
  )

  const sharedClients = await fetchAttendanceClients(supabase, {
    scope: { kind: 'gym', gymId: options.gymId },
    coachGymIds: options.coachGymIds,
    userId: options.coachId,
  })

  await ensureGymMemberCoachProfiles(options.gymId)

  const { clients, coachSelfClientIds } = await fetchGymMemberCoachClients(
    supabase,
    options.members,
    sharedClients
  )

  if (clients.length === 0) {
    return {
      clients: [],
      clientCoachRows: [],
      complianceByClientId: new Map(),
      attendanceStatsByClientId: new Map(),
      coachSelfClientIds: new Set(),
    }
  }

  const clientIds = clients.map((client) => client.id)

  const [clientCoachResult, complianceRows, attendanceHistory] =
    await Promise.all([
      supabase.from('clients').select('id, coach_id').in('id', clientIds),
      fetchComplianceDashboardRows(supabase, clients, {
        coachId: options.coachId,
        todayKey,
        weekStart,
        weekEnd,
        checkInPeriodStart,
        checkInPeriodEnd,
        checkInPeriodLabel,
      }),
      fetchClientAttendanceHistory(
        supabase,
        clientIds,
        monthStart,
        todayKey
      ),
    ])

  const clientCoachRows = (clientCoachResult.data ?? []) as ClientCoachRow[]
  const complianceByClientId = new Map(
    complianceRows.map((row) => [row.clientId, row])
  )
  const attendanceStatsByClientId = new Map<
    string,
    { monthAttended: number; monthTotal: number }
  >()

  for (const client of clients) {
    const recordsByDate = attendanceHistory.get(client.id) ?? new Map()
    const stats = computeClientAttendanceStats(recordsByDate, todayKey)
    attendanceStatsByClientId.set(client.id, {
      monthAttended: stats.monthAttended,
      monthTotal: stats.monthTotal,
    })
  }

  return {
    clients,
    clientCoachRows,
    complianceByClientId,
    attendanceStatsByClientId,
    coachSelfClientIds,
  }
}

export async function fetchGymSharedClientList(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    gymId: string
    coachId: string
    coachGymIds: Set<string>
    members: GymMemberWithProfile[]
    coachPreferences?: typeof defaultCoachPreferences
  }
): Promise<GymClientListItem[]> {
  const context = await fetchGymClientMetricsContext(supabase, options)

  if (context.clients.length === 0) {
    return []
  }

  return buildGymClientList(
    context.clients,
    context.clientCoachRows,
    options.members,
    context.complianceByClientId,
    context.attendanceStatsByClientId,
    context.coachSelfClientIds
  )
}

export function parseGymCoachFilter(
  coachParam: string | undefined,
  memberCoachIds: Set<string>
): string | null {
  if (!coachParam || !memberCoachIds.has(coachParam)) {
    return null
  }
  return coachParam
}

export function filterClientsByCoach(
  clients: AttendanceClientRow[],
  clientCoachRows: ClientCoachRow[],
  coachId: string | null
): AttendanceClientRow[] {
  if (!coachId) {
    return clients
  }

  const clientIdsForCoach = new Set(
    clientCoachRows
      .filter((row) => row.coach_id === coachId)
      .map((row) => row.id)
  )

  return clients.filter((client) => clientIdsForCoach.has(client.id))
}

export function aggregateAttendanceRate(
  stats: { monthAttended: number; monthTotal: number }[]
): number | null {
  const monthAttended = stats.reduce((sum, stat) => sum + stat.monthAttended, 0)
  const monthTotal = stats.reduce((sum, stat) => sum + stat.monthTotal, 0)
  if (monthTotal === 0) return null
  return Math.round((monthAttended / monthTotal) * 100)
}

export function aggregateSessionCompletionRate(
  rows: ComplianceClientRow[]
): number | null {
  let completed = 0
  let planned = 0

  for (const row of rows) {
    if (!row.sessionCompliance) continue
    completed += row.sessionCompliance.completed
    planned += row.sessionCompliance.planned
  }

  if (planned === 0) return null
  return Math.round((completed / planned) * 100)
}

export function buildCoachMetricsRows(
  members: GymMemberWithProfile[],
  clientsByCoachId: Map<string, AttendanceClientRow[]>,
  complianceByClientId: Map<string, ComplianceClientRow>,
  attendanceStatsByClientId: Map<
    string,
    { monthAttended: number; monthTotal: number }
  >
): GymCoachMetrics[] {
  return members
    .map((member) => {
      const clients = clientsByCoachId.get(member.coach_id) ?? []
      const complianceRows = clients
        .map((client) => complianceByClientId.get(client.id))
        .filter((row): row is ComplianceClientRow => row !== undefined)
      const attendanceStats = clients
        .map((client) => attendanceStatsByClientId.get(client.id))
        .filter(
          (stat): stat is { monthAttended: number; monthTotal: number } =>
            stat !== undefined
        )
      const summary = buildComplianceSummary(complianceRows)

      return {
        coachId: member.coach_id,
        coachName:
          member.profile?.full_name?.trim() ||
          member.profile?.business_name?.trim() ||
          'Coach',
        activeClients: clients.length,
        attendanceRate: aggregateAttendanceRate(attendanceStats),
        sessionCompletionRate: aggregateSessionCompletionRate(complianceRows),
        clientsNeedingAttention: summary.clientsNeedingAttention,
        elevatedLoadClients: summary.elevatedLoadClients,
        injuryFlagClients: summary.injuryFlagClients,
      }
    })
    .sort((left, right) => {
      if (right.activeClients !== left.activeClients) {
        return right.activeClients - left.activeClients
      }
      return left.coachName.localeCompare(right.coachName)
    })
}

export function buildGymOwnerDashboard(
  members: GymMemberWithProfile[],
  clients: AttendanceClientRow[],
  clientCoachRows: ClientCoachRow[],
  complianceRows: ComplianceClientRow[],
  attendanceStatsByClientId: Map<
    string,
    { monthAttended: number; monthTotal: number }
  >,
  monthLabel: string
): GymOwnerDashboard {
  const coachIdByClientId = new Map(
    clientCoachRows.map((row) => [row.id, row.coach_id])
  )
  const clientsByCoachId = new Map<string, AttendanceClientRow[]>()

  for (const client of clients) {
    const coachId = coachIdByClientId.get(client.id)
    if (!coachId) continue
    const existing = clientsByCoachId.get(coachId) ?? []
    existing.push(client)
    clientsByCoachId.set(coachId, existing)
  }

  const complianceByClientId = new Map(
    complianceRows.map((row) => [row.clientId, row])
  )
  const summaryStats = buildComplianceSummary(complianceRows)
  const allAttendanceStats = clients
    .map((client) => attendanceStatsByClientId.get(client.id))
    .filter(
      (stat): stat is { monthAttended: number; monthTotal: number } =>
        stat !== undefined
    )

  return {
    hasSharedClients: clients.length > 0,
    selectedCoachId: null,
    summary: {
      totalActiveClients: clients.length,
      totalCoaches: members.length,
      attendanceRate: aggregateAttendanceRate(allAttendanceStats),
      sessionCompletionRate: aggregateSessionCompletionRate(complianceRows),
      clientsNeedingAttention: summaryStats.clientsNeedingAttention,
      elevatedLoadClients: summaryStats.elevatedLoadClients,
      injuryFlagClients: summaryStats.injuryFlagClients,
      monthLabel,
    },
    coaches: buildCoachMetricsRows(
      members,
      clientsByCoachId,
      complianceByClientId,
      attendanceStatsByClientId
    ),
    clients: buildGymClientList(
      clients,
      clientCoachRows,
      members,
      complianceByClientId,
      attendanceStatsByClientId
    ),
  }
}

export function filterGymDashboardByCoach(
  dashboard: GymOwnerDashboard,
  coachId: string | null
): GymOwnerDashboard {
  if (!coachId) {
    return { ...dashboard, selectedCoachId: null }
  }

  const selectedCoach = dashboard.coaches.find(
    (coach) => coach.coachId === coachId
  )
  if (!selectedCoach) {
    return { ...dashboard, selectedCoachId: null }
  }

  return {
    ...dashboard,
    selectedCoachId: coachId,
    clients: dashboard.clients.filter((client) => client.coachId === coachId),
    summary: {
      ...dashboard.summary,
      totalActiveClients: selectedCoach.activeClients,
      attendanceRate: selectedCoach.attendanceRate,
      sessionCompletionRate: selectedCoach.sessionCompletionRate,
      clientsNeedingAttention: selectedCoach.clientsNeedingAttention,
      elevatedLoadClients: selectedCoach.elevatedLoadClients,
      injuryFlagClients: selectedCoach.injuryFlagClients,
    },
  }
}

export async function fetchGymOwnerDashboard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: {
    gymId: string
    coachId: string
    coachGymIds: Set<string>
    members: GymMemberWithProfile[]
    coachPreferences?: typeof defaultCoachPreferences
    filterCoachId?: string | null
  }
): Promise<GymOwnerDashboard> {
  const preferences = options.coachPreferences ?? defaultCoachPreferences
  const todayKey = getCoachDateKey(preferences.timezone)
  const monthLabel = new Date(`${todayKey}T12:00:00`).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const {
    clients,
    clientCoachRows,
    complianceByClientId,
    attendanceStatsByClientId: fullAttendanceStatsByClientId,
    coachSelfClientIds,
  } = await fetchGymClientMetricsContext(supabase, options)

  if (clients.length === 0) {
    return {
      ...buildGymOwnerDashboard(
        options.members,
        [],
        [],
        [],
        new Map(),
        monthLabel
      ),
      clients: [],
      selectedCoachId: options.filterCoachId ?? null,
    }
  }

  const complianceRows = Array.from(complianceByClientId.values())
  const clientsByCoachId = groupClientsByCoach(clients, clientCoachRows)

  const scopedClients = filterClientsByCoach(
    clients,
    clientCoachRows,
    options.filterCoachId ?? null
  )
  const scopedClientIds = new Set(scopedClients.map((client) => client.id))
  const scopedComplianceRows = complianceRows.filter((row) =>
    scopedClientIds.has(row.clientId)
  )
  const scopedAttendanceStatsByClientId = new Map<
    string,
    { monthAttended: number; monthTotal: number }
  >()

  for (const client of scopedClients) {
    const stats = fullAttendanceStatsByClientId.get(client.id)
    if (stats) {
      scopedAttendanceStatsByClientId.set(client.id, stats)
    }
  }

  return {
    ...buildGymOwnerDashboard(
      options.members,
      scopedClients,
      clientCoachRows,
      scopedComplianceRows,
      scopedAttendanceStatsByClientId,
      monthLabel
    ),
    hasSharedClients: clients.length > 0,
    coaches: buildCoachMetricsRows(
      options.members,
      clientsByCoachId,
      complianceByClientId,
      fullAttendanceStatsByClientId
    ),
    clients: buildGymClientList(
      clients,
      clientCoachRows,
      options.members,
      complianceByClientId,
      fullAttendanceStatsByClientId,
      coachSelfClientIds
    ),
    selectedCoachId: options.filterCoachId ?? null,
  }
}

function groupClientsByCoach(
  clients: AttendanceClientRow[],
  clientCoachRows: ClientCoachRow[]
): Map<string, AttendanceClientRow[]> {
  const coachIdByClientId = new Map(
    clientCoachRows.map((row) => [row.id, row.coach_id])
  )
  const clientsByCoachId = new Map<string, AttendanceClientRow[]>()

  for (const client of clients) {
    const coachId = coachIdByClientId.get(client.id)
    if (!coachId) continue
    const existing = clientsByCoachId.get(coachId) ?? []
    existing.push(client)
    clientsByCoachId.set(coachId, existing)
  }

  return clientsByCoachId
}

export function buildGymClientList(
  clients: AttendanceClientRow[],
  clientCoachRows: ClientCoachRow[],
  members: GymMemberWithProfile[],
  complianceByClientId: Map<string, ComplianceClientRow>,
  attendanceStatsByClientId: Map<
    string,
    { monthAttended: number; monthTotal: number }
  >,
  coachSelfClientIds: Set<string> = new Set()
): GymClientListItem[] {
  const coachIdByClientId = new Map(
    clientCoachRows.map((row) => [row.id, row.coach_id])
  )
  const coachNameById = new Map(
    members.map((member) => [
      member.coach_id,
      member.profile?.full_name?.trim() ||
        member.profile?.business_name?.trim() ||
        'Coach',
    ])
  )
  const coachAvatarById = new Map(
    members.map((member) => [
      member.coach_id,
      member.profile?.avatar_url ?? null,
    ])
  )

  return clients
    .map((client) => {
      const coachId = coachIdByClientId.get(client.id) ?? ''
      const compliance = complianceByClientId.get(client.id)
      const attendance = attendanceStatsByClientId.get(client.id)
      const attendanceRate =
        attendance && attendance.monthTotal > 0
          ? Math.round((attendance.monthAttended / attendance.monthTotal) * 100)
          : null

      return {
        clientId: client.id,
        clientName: client.full_name,
        avatarUrl: client.avatar_url,
        coachId,
        coachName: coachNameById.get(coachId) ?? 'Coach',
        coachAvatarUrl: coachAvatarById.get(coachId) ?? null,
        attendanceRate,
        sessionCompletion: compliance?.sessionCompliance ?? null,
        issueCount: compliance?.issueCount ?? 0,
        isGymCoachMember: coachSelfClientIds.has(client.id),
      }
    })
    .sort((left, right) => left.clientName.localeCompare(right.clientName))
}

export function formatGymMetricsCsv(
  dashboard: GymOwnerDashboard,
  options: { anonymize?: boolean; gymName: string } = { gymName: 'Gym' }
): string {
  const { summary, coaches } = dashboard
  const lines: string[] = [
    `Gym,${escapeCsvCell(options.gymName)}`,
    `Month,${escapeCsvCell(summary.monthLabel)}`,
    '',
    'Metric,Value',
    `Active clients,${summary.totalActiveClients}`,
    `Coaches,${summary.totalCoaches}`,
    `Attendance rate,${formatCsvPercent(summary.attendanceRate)}`,
    `Session completion,${formatCsvPercent(summary.sessionCompletionRate)}`,
    `Clients needing attention,${summary.clientsNeedingAttention}`,
    `Elevated load clients,${summary.elevatedLoadClients}`,
    `Injury flags,${summary.injuryFlagClients}`,
    '',
    'Coach,Active clients,Attendance rate,Session completion,Needs attention,Elevated load,Injury flags',
  ]

  coaches.forEach((coach, index) => {
    const label = options.anonymize
      ? `Coach ${String.fromCharCode(65 + index)}`
      : coach.coachName
    lines.push(
      [
        escapeCsvCell(label),
        coach.activeClients,
        formatCsvPercent(coach.attendanceRate),
        formatCsvPercent(coach.sessionCompletionRate),
        coach.clientsNeedingAttention,
        coach.elevatedLoadClients,
        coach.injuryFlagClients,
      ].join(',')
    )
  })

  return lines.join('\n')
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatCsvPercent(value: number | null): string {
  return value === null ? 'N/A' : `${value}%`
}
