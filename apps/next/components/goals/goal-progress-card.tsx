import { TrackableGoalCard } from '@/components/goals/trackable-goal-card'
import {
  computeCompositionProgress,
  formatCompositionGoalLabel,
} from '@/lib/goal-progress'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { ClientGoal } from 'app/types/database'
import type { CoachPreferences } from '@/lib/coach-preferences'

type GoalProgressCardProps = {
  goal: ClientGoal
  context: Pick<GoalProgressContext, 'scans' | 'checkIns'>
  coachPreferences?: Pick<CoachPreferences, 'weekStartsOn' | 'timezone'>
}

export function GoalProgressCard({
  goal,
  context,
  coachPreferences,
}: GoalProgressCardProps) {
  const progress = computeCompositionProgress(
    goal,
    context.scans,
    context.checkIns,
    coachPreferences
  )
  const label = formatCompositionGoalLabel(goal)

  return <TrackableGoalCard title={label} progress={progress} targetDate={goal.target_date} />
}
