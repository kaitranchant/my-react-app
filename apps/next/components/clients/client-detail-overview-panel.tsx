import { Suspense } from 'react'

import { createClient } from '@/lib/supabase/server'
import { getWeekDayLabels, toDateKey, addDaysToDateKey } from '@/lib/calendar'
import { defaultCoachPreferences, getCoachDateKey } from '@/lib/coach-preferences'
import {
  getCoachOnboardingMilestoneTemplate,
  getCoachPreferencesForUser,
} from '@/lib/coach-preferences-server'
import type { ClientWorkoutActivity } from '@/lib/client-metrics'
import { fetchClientLoadMetrics } from '@/lib/load-queries'
import { fetchTrainingConsistencyHeatmap } from '@/lib/training-consistency'
import { hasNutritionTargets } from '@/lib/nutrition'
import { averageAdherenceScore } from '@/lib/nutrition-trends'
import { ClientDetailOverviewSection } from '@/components/clients/client-detail-overview-section'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { ClientOnboardingMilestoneTemplate } from '@/lib/client-onboarding'
import type { RecentPrHighlight } from '@/lib/pr-records'
import type { TrainingConsistencyHeatmap } from '@/lib/training-consistency'
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

type OverviewCoreProps = {
  client: Client
  activeAssignment: ClientProgramAssignment | null
  weekSessions: CalendarDaySummary[]
  recentWorkouts: ClientWorkoutActivity[]
  streakWorkouts: ClientWorkoutActivity[]
  checkIns: ClientCheckIn[]
  coachPreferences: CoachPreferences
  onboardingMilestoneTemplate: ClientOnboardingMilestoneTemplate
  assessmentCount: number
  nutritionSnapshot: {
    hasTargets: boolean
    hasMealPlan: boolean
    lastLogDate: string | null
    avgAdherence7d: number | null
    loggedToday: boolean
  }
}

async function ClientDetailOverviewLoadEnrichment({
  clientId,
  weekStartsOn,
  core,
}: {
  clientId: string
  weekStartsOn: CoachPreferences['weekStartsOn']
  core: OverviewCoreProps
}) {
  const supabase = await createClient()
  const [loadMetrics, trainingConsistency] = await Promise.all([
    fetchClientLoadMetrics(supabase, clientId),
    fetchTrainingConsistencyHeatmap(supabase, clientId, weekStartsOn),
  ])

  return (
    <ClientDetailOverviewSection
      {...core}
      loadMetrics={{
        thisWeekVolume: loadMetrics.thisWeekVolume,
        volumeDeltaLabel: loadMetrics.volumeDeltaLabel,
        acwrLabel: loadMetrics.acwrLabel,
        acwrVariant: loadMetrics.acwrVariant,
      }}
      recentPrs={loadMetrics.recentPrs}
      trainingConsistency={trainingConsistency}
    />
  )
}

export async function ClientDetailOverviewPanel({
  client,
  clientId,
  coachUserId,
}: ClientDetailOverviewPanelProps) {
  const supabase = await createClient()
  const today = new Date()
  const [coachPreferences, onboardingMilestoneTemplate] = await Promise.all([
    coachUserId
      ? getCoachPreferencesForUser(coachUserId)
      : Promise.resolve(defaultCoachPreferences),
    coachUserId
      ? getCoachOnboardingMilestoneTemplate(coachUserId)
      : Promise.resolve({}),
  ])
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
    assessmentCountResult,
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
    supabase
      .from('client_assessments')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId),
  ])

  const core: OverviewCoreProps = {
    client,
    activeAssignment: assignmentData
      ? (assignmentData as ClientProgramAssignment)
      : null,
    weekSessions: (weekResult.data ?? []) as CalendarDaySummary[],
    recentWorkouts: (recentWorkoutsResult.data ?? []) as ClientWorkoutActivity[],
    streakWorkouts: (streakWorkoutsResult.data ?? []) as ClientWorkoutActivity[],
    checkIns: (checkInsResult.data ?? []) as ClientCheckIn[],
    coachPreferences,
    onboardingMilestoneTemplate,
    assessmentCount: assessmentCountResult.count ?? 0,
    nutritionSnapshot: {
      hasTargets: hasNutritionTargets(nutritionProfileResult.data ?? null),
      hasMealPlan: Boolean(activeMealPlanResult.data),
      lastLogDate: (recentNutritionLogsResult.data ?? [])[0]?.log_date ?? null,
      avgAdherence7d: averageAdherenceScore(recentNutritionLogsResult.data ?? []),
      loggedToday: Boolean(todayNutritionLogResult.data),
    },
  }

  return (
    <Suspense
      fallback={
        <ClientDetailOverviewSection
          {...core}
          loadMetrics={undefined}
          recentPrs={[] as RecentPrHighlight[]}
          trainingConsistency={null as TrainingConsistencyHeatmap | null}
        />
      }
    >
      <ClientDetailOverviewLoadEnrichment
        clientId={clientId}
        weekStartsOn={coachPreferences.weekStartsOn}
        core={core}
      />
    </Suspense>
  )
}
