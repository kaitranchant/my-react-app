import { TrackableGoalCard } from '@/components/goals/trackable-goal-card'
import {
  computePerformanceProgress,
  formatPerformanceGoalLabel,
} from '@/lib/goal-progress'
import { getExerciseName } from '@/lib/goal-progress-context'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { ClientGoal } from 'app/types/database'

type PerformanceGoalCardProps = {
  goal: ClientGoal
  context: Pick<
    GoalProgressContext,
    'prRecords' | 'exercises' | 'bestDurationByExerciseId'
  >
}

export function PerformanceGoalCard({ goal, context }: PerformanceGoalCardProps) {
  const progress = computePerformanceProgress(
    goal,
    context.prRecords,
    context.bestDurationByExerciseId
  )
  const exerciseName = getExerciseName(context.exercises, goal.exercise_id)
  const label = formatPerformanceGoalLabel(goal, exerciseName)

  return (
    <TrackableGoalCard
      title={label}
      progress={progress}
      targetDate={goal.target_date}
    />
  )
}
