'use client'

import { ClipboardList } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getWorkoutDisplayStatus, workoutHasProgress } from '@/lib/workout-log'
import {
  getWorkoutToneContainerClass,
  getWorkoutToneDotClass,
} from '@/lib/status-colors'
import { cn } from '@/lib/utils'
import type { CalendarDaySummary } from 'app/types/database'

type SelectWorkoutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  workouts: CalendarDaySummary[]
  onSelect: (workoutId: string) => void
}

export function SelectWorkoutDialog({
  open,
  onOpenChange,
  title = 'Choose a workout',
  description = 'Select which workout you want to log.',
  workouts,
  onSelect,
}: SelectWorkoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {workouts.map((workout) => {
            const { label, tone } = getWorkoutDisplayStatus(
              workout.status,
              workoutHasProgress(workout, [])
            )

            return (
              <button
                key={workout.id}
                type="button"
                onClick={() => {
                  onSelect(workout.id)
                  onOpenChange(false)
                }}
                className={cn(
                  'hover:bg-muted/50 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  getWorkoutToneContainerClass(tone, false)
                )}
              >
                <span
                  className={cn(
                    'mt-1 size-2.5 shrink-0 rounded-full',
                    getWorkoutToneDotClass(tone, false)
                  )}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{workout.name}</span>
                  <span className="text-muted-foreground mt-0.5 block text-sm">
                    {label}
                  </span>
                </span>
                <ClipboardList className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
