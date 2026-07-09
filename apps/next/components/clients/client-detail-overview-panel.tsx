import { createClient } from '@/lib/supabase/server'
import { getMonthDateRange, getWeekDayLabels, toDateKey, addDaysToDateKey } from '@/lib/calendar'
import { defaultCoachPreferences, getCoachDateKey } from '@/lib/coach-preferences'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import type { ClientWorkoutActivity } from '@/lib/client-metrics'
import { fetchClientLoadMetrics } from '@/lib/load-queries'
import { fetchTrainingConsistencyHeatmap } from '@/lib/training-consistency'
import { hasNutritionTargets } from '@/lib/nutrition'
import { averageAdherenceScore } from '@/lib/nutrition-trends'
import { ClientDetailOverviewSection } from '@/components/clients/client-detail-overview-section'
import type {
  CalendarDaySummary,
  Client,
  ClientCheckIn,
  ClientProgramAssignment,
} from 'app/types/database'

type ClientDetailOverviewPanelProps = {
  client: Client
  clientId: string
  coachUserId: string | null
}

export async function ClientDetailOverviewPanel({
  client,
  clientId,
  coachUserId,
}: ClientDetailOverviewPanelProps) {
  const supabase = await createClient()
  const today = new Date()
  const coachPreferences = coachUserId
    ? await getCoachPreferencesForUser(coachUserId)
    : defaultCoachPreferences
  const weekDateKeys = getWeekDayLabels(coachPreferences.weekStartsOn).map(
    (day) => day.dateKey
  )
  const weekStart = weekDateKeys[0]
  const weekEnd = weekDateKeys[weekDateKeys.length - 1]
  const streakStart = toDateKey(
    new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90)
  )

  const coachTodayKey = getCoachDateKey(coachPreferences.timezone)
  const nutritionLookbackStart = addDaysToDateKey(coachTodayKey, -6)

  const [
    { data: assignmentData },
    weekResult,
    recentWorkoutsResult,
    streakWorkoutsResult,
    checkInsResult,
    nutritionProfileResult,
    activeMealPlanResult,
    recentNutritionLogsResult,
    todayNutritionLogResult,
  ] = await Promise.all([
    supabase
      .from('program_assignments')
      .select('*, program:programs(id, name, description, status), team:teams(id, name)')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('client_scheduled_workouts')
      .select('id, scheduled_date, name, status, started_at')
      .eq('client_id', clientId)
      .gte('scheduled_date', weekStart)
      .lte('scheduled_date', weekEnd)
      .order('scheduled_date', { ascending: true }),
    supabase
      .from('client_scheduled_workouts')
      .select(
        'id, name, status, scheduled_date, started_at, completed_at, updated_at'
      )
      .eq('client_id', clientId)
      .in('status', ['completed', 'skipped'])
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('client_scheduled_workouts')
      .select('status, scheduled_date, completed_at')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .gte('scheduled_date', streakStart)
      .order('scheduled_date', { ascending: false }),
    supabase
      .from('client_check_ins')
      .select('*')
      .eq('client_id', clientId)
      .order('check_in_date', { ascending: false })
      .limit(50),
    supabase
      .from('client_nutrition_profiles')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle(),
    supabase
      .from('meal_plan_assignments')
      .select('id')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('client_nutrition_logs')
      .select('*')
      .eq('client_id', clientId)
      .gte('log_date', nutritionLookbackStart)
      .lte('log_date', coachTodayKey)
      .order('log_date', { ascending: false }),
    supabase
      .from('client_nutrition_logs')
      .select('id')
      .eq('client_id', clientId)
      .eq('log_date', coachTodayKey)
      .maybeSingle(),
  ])

  const activeAssignment = assignmentData
    ? (assignmentData as ClientProgramAssignment)
    : null
  const weekSessions = (weekResult.data ?? []) as CalendarDaySummary[]
  const recentWorkouts = (recentWorkoutsResult.data ??
    []) as ClientWorkoutActivity[]
  const streakWorkouts = (streakWorkoutsResult.data ??
    []) as ClientWorkoutActivity[]
  const checkIns = (checkInsResult.data ?? []) as ClientCheckIn[]
  const nutritionProfile = nutritionProfileResult.data ?? null
  const recentNutritionLogs = recentNutritionLogsResult.data ?? []
  const nutritionSnapshot = {
    hasTargets: hasNutritionTargets(nutritionProfile),
    hasMealPlan: Boolean(activeMealPlanResult.data),
    lastLogDate: recentNutritionLogs[0]?.log_date ?? null,
    avgAdherence7d: averageAdherenceScore(recentNutritionLogs),
    loggedToday: Boolean(todayNutritionLogResult.data),
  }

  const [loadMetrics, trainingConsistency] = await Promise.all([
    fetchClientLoadMetrics(supabase, clientId),
    fetchTrainingConsistencyHeatmap(
      supabase,
      clientId,
      coachPreferences.weekStartsOn
    ),
  ])

  return (
    <ClientDetailOverviewSection
      client={client}
      activeAssignment={activeAssignment}
      weekSessions={weekSessions}
      recentWorkouts={recentWorkouts}
      streakWorkouts={streakWorkouts}
      checkIns={checkIns}
      loadMetrics={{
        thisWeekVolume: loadMetrics.thisWeekVolume,
        volumeDeltaLabel: loadMetrics.volumeDeltaLabel,
        acwrLabel: loadMetrics.acwrLabel,
        acwrVariant: loadMetrics.acwrVariant,
      }}
      recentPrs={loadMetrics.recentPrs}
      trainingConsistency={trainingConsistency}
      coachPreferences={coachPreferences}
      nutritionSnapshot={nutritionSnapshot}
    />
  )
}
