'use client'

import { useRouter } from 'next/navigation'

import { WorkoutLogScreen } from '@/components/calendar/workout-log-modal'
import type {
  Exercise,
  ScheduledWorkoutStatus,
  WeightUnit,
} from 'app/types/database'

type WorkoutLogPageProps = {
  clientId: string
  workoutId: string
  selectedDate: string
  initialStatus: ScheduledWorkoutStatus
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  variant: 'coach' | 'client'
  weightUnit?: WeightUnit
  returnHref: string
  athleteName?: string
  defaultSessionViewMode?: 'guided' | 'list'
}

export function WorkoutLogPage({
  clientId,
  workoutId,
  selectedDate,
  initialStatus,
  exercises,
  variant,
  weightUnit = 'lbs',
  returnHref,
  athleteName,
  defaultSessionViewMode = 'guided',
}: WorkoutLogPageProps) {
  const router = useRouter()

  return (
    <WorkoutLogScreen
      presentation="page"
      active
      clientId={clientId}
      workoutId={workoutId}
      selectedDate={selectedDate}
      initialStatus={initialStatus}
      exercises={exercises}
      variant={variant}
      weightUnit={weightUnit}
      returnHref={returnHref}
      athleteName={athleteName}
      defaultSessionViewMode={defaultSessionViewMode}
      onChanged={() => router.refresh()}
    />
  )
}
