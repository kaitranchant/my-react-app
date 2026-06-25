import { TrackableGoalCard } from '@/components/goals/trackable-goal-card'
import { computeHabitProgress, formatHabitGoalLabel } from '@/lib/goal-progress'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { ClientGoal } from 'app/types/database'
import type { CoachPreferences } from '@/lib/coach-preferences'

type HabitGoalCardProps = {
  goal: ClientGoal
  context: Pick<GoalProgressContext, 'workouts' | 'checkIns' | 'nutritionLogs'>
  coachPreferences?: Pick<CoachPreferences, 'weekStartsOn' | 'timezone'>
  presentation?: 'default' | 'portal'
}

export function HabitGoalCard({
  goal,
  context,
  coachPreferences,
  presentation = 'default',
}: HabitGoalCardProps) {
  const progress = computeHabitProgress(
    goal,
    context.workouts,
    context.checkIns,
    coachPreferences,
    context.nutritionLogs
  )
  const label = formatHabitGoalLabel(goal)

  return (
    <TrackableGoalCard
      title={label}
      progress={progress}
      targetDate={goal.target_date}
      presentation={presentation}
    />
  )
}
