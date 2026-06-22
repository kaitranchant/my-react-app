import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import {
  getWorkoutLogHref,
  type WorkoutLogContext,
} from '@/lib/workout-log-routes'

type OpenWorkoutLogOptions = {
  router: AppRouterInstance
  isMobile: boolean
  workoutId: string
  selectedDate: string
  context: WorkoutLogContext
  openModal?: () => void
}

export function openWorkoutLog({
  router,
  isMobile,
  workoutId,
  selectedDate,
  context,
  openModal,
}: OpenWorkoutLogOptions) {
  if (isMobile) {
    router.push(getWorkoutLogHref(workoutId, selectedDate, context))
    return
  }

  openModal?.()
}
