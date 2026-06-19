import { getWeekDayLabels, toDateKey } from '@/lib/calendar'
import { calcClientCompletionRate } from '@/lib/client-metrics'
import { formatAcwrLabel, calcAcwr } from '@/lib/load-analytics'
import {
  buildVolumeRowsFromLogData,
  fetchClientLogRows,
} from '@/lib/load-queries'
import { fetchMemberLastActiveLabels } from '@/lib/team-activity'
import type { createClient } from '@/lib/supabase/server'
import type { TeamMemberPerformance, TeamPerformanceSummary } from 'app/types/database'

function isOnTrack(
  completionRate: number | null,
  acwrRiskLevel: string
): boolean {
  if (completionRate === null) return false
  if (completionRate < 60) return false
  if (acwrRiskLevel === 'overreaching') return false
  return true
}

export async function fetchTeamPerformanceSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  members: { id: string; full_name: string }[]
): Promise<TeamPerformanceSummary> {
  if (members.length === 0) {
    return {
      avgCompletionRate: null,
      onTrackCount: 0,
      behindCount: 0,
      avgAcwrLabel: '—',
      members: [],
    }
  }

  const today = new Date()
  const weekDateKeys = getWeekDayLabels().map((day) => day.dateKey)
  const weekStart = weekDateKeys[0]
  const weekEnd = weekDateKeys[weekDateKeys.length - 1]
  const eightWeeksAgo = new Date(today)
  eightWeeksAgo.setDate(today.getDate() - 7 * 8)
  const logStartKey = toDateKey(eightWeeksAgo)
  const lastActiveByClientId = await fetchMemberLastActiveLabels(
    supabase,
    members.map((member) => member.id)
  )

  const memberResults: TeamMemberPerformance[] = []
  const acwrRatios: number[] = []
  const completionRates: number[] = []

  for (const member of members) {
    const [{ data: weekWorkouts }, logRows] = await Promise.all([
      supabase
        .from('client_scheduled_workouts')
        .select('status')
        .eq('client_id', member.id)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd),
      fetchClientLogRows(supabase, member.id, logStartKey),
    ])

    const completionRate = calcClientCompletionRate(weekWorkouts ?? [])
    const volumeRows = buildVolumeRowsFromLogData(logRows)
    const acwr = calcAcwr(
      volumeRows.map((row) => ({ dateKey: row.dateKey, volume: row.value })),
      today
    )
    const acwrLabel = formatAcwrLabel(acwr)
    const onTrack = isOnTrack(completionRate, acwr.riskLevel)

    if (completionRate !== null) completionRates.push(completionRate)
    if (acwr.ratio !== null) acwrRatios.push(acwr.ratio)

    memberResults.push({
      clientId: member.id,
      clientName: member.full_name,
      completionRate,
      acwrLabel,
      lastActiveLabel: lastActiveByClientId[member.id] ?? 'No activity yet',
      onTrack,
    })
  }

  const avgCompletionRate =
    completionRates.length > 0
      ? Math.round(
          completionRates.reduce((sum, value) => sum + value, 0) /
            completionRates.length
        )
      : null

  const avgAcwrRatio =
    acwrRatios.length > 0
      ? acwrRatios.reduce((sum, value) => sum + value, 0) / acwrRatios.length
      : null

  const avgAcwrLabel =
    avgAcwrRatio !== null ? avgAcwrRatio.toFixed(2) : '—'

  const onTrackCount = memberResults.filter((member) => member.onTrack).length

  return {
    avgCompletionRate,
    onTrackCount,
    behindCount: members.length - onTrackCount,
    avgAcwrLabel,
    members: memberResults.sort((a, b) =>
      a.clientName.localeCompare(b.clientName)
    ),
  }
}
