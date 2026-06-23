import { TrackableGoalCard } from '@/components/goals/trackable-goal-card'
import {
  computeMilestoneProgress,
  formatMilestoneGoalLabel,
} from '@/lib/goal-progress'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { ClientGoal } from 'app/types/database'

type MilestoneGoalCardProps = {
  goal: ClientGoal
  context: Pick<
    GoalProgressContext,
    'workouts' | 'programDayOffsets' | 'activeAssignment'
  >
  presentation?: 'default' | 'portal'
}

export function MilestoneGoalCard({
  goal,
  context,
  presentation = 'default',
}: MilestoneGoalCardProps) {
  const programId = goal.program_id ?? context.activeAssignment?.program_id ?? null
  const assignmentStart =
    goal.milestone_type === 'program_completion' &&
    programId &&
    context.activeAssignment?.program_id === programId
      ? context.activeAssignment.start_date
      : null

  const progress = computeMilestoneProgress(
    goal,
    context.workouts,
    context.programDayOffsets,
    assignmentStart
  )
  const label = formatMilestoneGoalLabel(goal)

  return (
    <TrackableGoalCard
      title={label}
      progress={progress}
      targetDate={goal.target_date}
      presentation={presentation}
    />
  )
}
