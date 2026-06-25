'use client'

import { Printer } from 'lucide-react'
import { toast } from 'sonner'

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
      onClick={() => {
        const ok = printScheduledWorkout(workout, selectedDate, subtitle)
        if (!ok) {
          toast.error('Could not open the print view. Please try again.')
        }
      }}
    >
      <Printer className="size-4" />
      Print
    </Button>
  )
}
