'use client'

import { Printer } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { printScheduledWorkout } from '@/lib/print-scheduled-workout'
import type { ClientScheduledWorkoutWithExercises } from 'app/types/database'

type PrintWorkoutButtonProps = {
  workout: ClientScheduledWorkoutWithExercises
  selectedDate: string
  subtitle?: string
}

export function PrintWorkoutButton({
  workout,
  selectedDate,
  subtitle,
}: PrintWorkoutButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => printScheduledWorkout(workout, selectedDate, subtitle)}
    >
      <Printer className="size-4" />
      Print
    </Button>
  )
}
