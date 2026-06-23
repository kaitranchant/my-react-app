import { toDateKey } from '@/lib/calendar'
import {
  DAYS_PER_PROGRAM_WEEK,
  getMaxWeekIndexForOffsets,
} from '@/lib/program-calendar'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseDateKeyDaysBetween } from '@/lib/team-activity'
import type { createClient } from '@/lib/supabase/server'
import type { CalendarDaySummary } from 'app/types/database'

export type ClientProgramSummary = {
  currentWeek: number
  totalWeeks: number
  completedThisWeek: number
  scheduledThisWeek: number
}

export async function fetchClientProgramSummary(
  supabase: Awaited<ReturnType<typeof createClient>>,
  programId: string,
  startDate: string | null,
  weekSessions: CalendarDaySummary[],
  options?: {
    clientId?: string
    todayKey?: string
  }
): Promise<ClientProgramSummary | null> {
  let resolvedStartDate = startDate?.trim() || null

  if (!resolvedStartDate && options?.clientId) {
    const { data: earliestWorkout } = await supabase
      .from('client_scheduled_workouts')
      .select('scheduled_date')
      .eq('client_id', options.clientId)
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .maybeSingle()

    resolvedStartDate = earliestWorkout?.scheduled_date ?? null
  }

  if (!resolvedStartDate) return null

  const { data: programDays } = await supabase
    .from('program_scheduled_workouts')
    .select('day_offset')
    .eq('program_id', programId)

  let offsets = (programDays ?? []).map((row) => row.day_offset)

  if (offsets.length === 0) {
    const admin = createAdminClient()
    if (admin) {
      const { data: adminProgramDays } = await admin
        .from('program_scheduled_workouts')
        .select('day_offset')
        .eq('program_id', programId)

      offsets = (adminProgramDays ?? []).map((row) => row.day_offset)
    }
  }

  if (offsets.length === 0) return null

  const todayKey = options?.todayKey ?? toDateKey(new Date())
  const dayOffset = Math.max(
    0,
    parseDateKeyDaysBetween(resolvedStartDate, todayKey)
  )
  const currentWeek = Math.floor(dayOffset / DAYS_PER_PROGRAM_WEEK) + 1
  const totalWeeks = getMaxWeekIndexForOffsets(offsets) + 1

  const scheduledThisWeek = weekSessions.length
  const completedThisWeek = weekSessions.filter(
    (session) => session.status === 'completed'
  ).length

  return {
    currentWeek,
    totalWeeks,
    completedThisWeek,
    scheduledThisWeek,
  }
}

export function formatClientProgramSummaryLine(
  summary: ClientProgramSummary
): string {
  const weekPart = `Week ${summary.currentWeek} of ${summary.totalWeeks}`
  if (summary.scheduledThisWeek === 0) {
    return weekPart
  }
  const workoutPart = `${summary.completedThisWeek} of ${summary.scheduledThisWeek} workout${summary.scheduledThisWeek === 1 ? '' : 's'} completed`
  return `${weekPart} · ${workoutPart}`
}
