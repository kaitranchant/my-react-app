import {
  type CoachPreferences,
  defaultCoachPreferences,
} from '@/lib/coach-preferences'
import {
  formatFormReviewCoachReplyMessage,
  hasFormReviewCoachReply,
  isFormReviewPending,
} from '@/lib/form-reviews'
import {
  computeCompositionProgress,
  computeHabitProgress,
  computeMilestoneProgress,
  computePerformanceProgress,
  formatCompositionGoalLabel,
  formatHabitGoalLabel,
  formatMilestoneGoalLabel,
  formatPerformanceGoalLabel,
  isNegativeGoalStatus,
  sortClientGoals,
  type GoalProgressStatus,
} from '@/lib/goal-progress'
import {
  fetchGoalProgressContext,
  getExerciseName,
} from '@/lib/goal-progress-context'
import type { createClient } from '@/lib/supabase/server'
import type { ClientGoal } from 'app/types/database'

export type PortalGoalHighlight = {
  id: string
  label: string
  percent: number
  status: GoalProgressStatus
  isNegative: boolean
}

export type PortalFormReviewHighlight = {
  pendingCount: number
  recentCoachReply: {
    id: string
    message: string
  } | null
}

const TRACKABLE_GOAL_CATEGORIES = new Set<ClientGoal['category']>([
  'habit',
  'performance',
  'composition',
  'milestone',
])

const MAX_HOME_GOALS = 3

function resolveGoalHighlight(
  goal: ClientGoal,
  context: Awaited<ReturnType<typeof fetchGoalProgressContext>>,
  coachPreferences: CoachPreferences
): PortalGoalHighlight {
  let progress
  let label: string

  switch (goal.category) {
    case 'performance':
      progress = computePerformanceProgress(
        goal,
        context.prRecords,
        context.bestDurationByExerciseId
      )
      label = formatPerformanceGoalLabel(
        goal,
        getExerciseName(context.exercises, goal.exercise_id)
      )
      break
    case 'habit':
      progress = computeHabitProgress(
        goal,
        context.workouts,
        context.checkIns,
        coachPreferences
      )
      label = formatHabitGoalLabel(goal)
      break
    case 'milestone': {
      const programId =
        goal.program_id ?? context.activeAssignment?.program_id ?? null
      const assignmentStart =
        goal.milestone_type === 'program_completion' &&
        programId &&
        context.activeAssignment?.program_id === programId
          ? context.activeAssignment.start_date
          : null

      progress = computeMilestoneProgress(
        goal,
        context.workouts,
        context.programDayOffsets,
        assignmentStart
      )
      label = formatMilestoneGoalLabel(goal)
      break
    }
    case 'composition':
      progress = computeCompositionProgress(
        goal,
        context.scans,
        context.checkIns,
        coachPreferences
      )
      label = formatCompositionGoalLabel(goal)
      break
    default:
      progress = {
        status: 'awaiting_data' as const,
        percent: 0,
        detailLine: '',
        hint: null,
        paceStatus: null,
        estimatedCompletionLabel: null,
      }
      label = goal.title?.trim() || 'Goal'
  }

  return {
    id: goal.id,
    label,
    percent: progress.percent,
    status: progress.status,
    isNegative: isNegativeGoalStatus(progress.status),
  }
}

export async function fetchPortalHomeGoalHighlights(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string,
  coachPreferences: CoachPreferences = defaultCoachPreferences
): Promise<PortalGoalHighlight[]> {
  const [goalsResult, context] = await Promise.all([
    supabase
      .from('client_goals')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true }),
    fetchGoalProgressContext(supabase, clientId),
  ])

  if (goalsResult.error?.message?.includes('Could not find the table')) {
    return []
  }

  const trackableGoals = sortClientGoals(
    ((goalsResult.data ?? []) as ClientGoal[]).filter((goal) =>
      TRACKABLE_GOAL_CATEGORIES.has(goal.category)
    )
  )

  if (trackableGoals.length === 0) {
    return []
  }

  const highlights = trackableGoals.map((goal) =>
    resolveGoalHighlight(goal, context, coachPreferences)
  )
  const activeHighlights = highlights.filter(
    (highlight) => highlight.status !== 'complete'
  )
  const selected =
    activeHighlights.length > 0 ? activeHighlights : highlights

  return selected.slice(0, MAX_HOME_GOALS)
}

export async function fetchPortalFormReviewHighlight(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clientId: string
): Promise<PortalFormReviewHighlight | null> {
  const { data, error } = await supabase
    .from('client_form_reviews')
    .select(
      'id, title, content_type, reviewed_at, coach_feedback, coach_annotations, exercise:exercises(id, name)'
    )
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error?.message?.includes('Could not find the table')) {
    return null
  }

  const reviews = (data ?? []).map((row) => {
    const exercise = Array.isArray(row.exercise) ? row.exercise[0] : row.exercise
    return {
      ...row,
      exercise: exercise ?? null,
    }
  })

  const pendingCount = reviews.filter((review) =>
    isFormReviewPending(review)
  ).length

  const recentCoachReply = reviews.find(
    (review) => review.reviewed_at != null && hasFormReviewCoachReply(review)
  )

  return {
    pendingCount,
    recentCoachReply: recentCoachReply
      ? {
          id: recentCoachReply.id,
          message: formatFormReviewCoachReplyMessage(recentCoachReply),
        }
      : null,
  }
}
