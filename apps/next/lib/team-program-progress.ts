import { toDateKey } from '@/lib/calendar'
import {
  DAYS_PER_PROGRAM_WEEK,
  getMaxWeekIndexForOffsets,
  getPhaseForDayOffset,
} from '@/lib/program-calendar'
import type { createClient } from '@/lib/supabase/server'
import type { TeamProgramHistoryEntry, TeamProgramProgress } from 'app/types/database'
import { parseDateKeyDaysBetween } from '@/lib/team-activity'

export async function fetchTeamProgramProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  programStartDate: string | null,
  memberClientIds: string[]
): Promise<TeamProgramProgress | null> {
  if (!programStartDate) return null

  const { data: programDays } = await supabase
    .from('program_scheduled_workouts')
    .select('day_offset')
    .eq('program_id', programId)

  const offsets = (programDays ?? []).map((row) => row.day_offset)
  if (offsets.length === 0) {
    return {
      currentWeek: 1,
      totalWeeks: 1,
      workoutsThisWeek: 0,
      workoutsRemainingThisWeek: 0,
      currentPhase: null,
    }
  }

  const todayKey = toDateKey(new Date())
  const dayOffset = Math.max(0, parseDateKeyDaysBetween(programStartDate, todayKey))
  const currentWeek = Math.floor(dayOffset / DAYS_PER_PROGRAM_WEEK) + 1
  const totalWeeks =
    getMaxWeekIndexForOffsets(offsets) + 1
  const weekStartOffset =
    Math.floor(dayOffset / DAYS_PER_PROGRAM_WEEK) * DAYS_PER_PROGRAM_WEEK
  const weekEndOffset = weekStartOffset + DAYS_PER_PROGRAM_WEEK - 1

  const { data: phaseRows } = await supabase
    .from('program_phases')
    .select('id, name, start_day_offset, end_day_offset')
    .eq('program_id', programId)
    .order('sort_order', { ascending: true })

  const currentPhaseRow = getPhaseForDayOffset(phaseRows ?? [], dayOffset)
  const currentPhase = currentPhaseRow
    ? { id: currentPhaseRow.id, name: currentPhaseRow.name }
    : null

  const workoutsThisWeek = offsets.filter(
    (offset) => offset >= weekStartOffset && offset <= weekEndOffset
  ).length

  let workoutsRemainingThisWeek = 0

  if (memberClientIds.length > 0) {
    const weekStartDate = addDays(programStartDate, weekStartOffset)
    const weekEndDate = addDays(programStartDate, weekEndOffset)

    const { data: scheduled } = await supabase
      .from('client_scheduled_workouts')
      .select('status')
      .in('client_id', memberClientIds)
      .gte('scheduled_date', weekStartDate)
      .lte('scheduled_date', weekEndDate)
      .neq('status', 'completed')

    workoutsRemainingThisWeek = scheduled?.length ?? 0
  } else {
    workoutsRemainingThisWeek = offsets.filter(
      (offset) =>
        offset >= dayOffset &&
        offset >= weekStartOffset &&
        offset <= weekEndOffset
    ).length
  }

  return {
    currentWeek,
    totalWeeks,
    workoutsThisWeek,
    workoutsRemainingThisWeek,
    currentPhase,
  }
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}

export async function fetchTeamProgramHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string
): Promise<TeamProgramHistoryEntry[]> {
  const { data } = await supabase
    .from('program_assignments')
    .select('program_id, start_date, status, updated_at, program:programs(id, name)')
    .eq('team_id', teamId)
    .neq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(20)

  const seen = new Set<string>()
  const entries: TeamProgramHistoryEntry[] = []

  for (const row of data ?? []) {
    const program = row.program as { id: string; name: string } | null
    if (!program) continue
    const key = `${program.id}-${row.start_date ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)

    entries.push({
      programId: program.id,
      programName: program.name,
      startDate: row.start_date,
      status: row.status as TeamProgramHistoryEntry['status'],
      endedAt: row.updated_at,
    })
  }

  return entries
}
