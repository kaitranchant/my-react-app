'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  addScheduledExercise,
  removeScheduledExercise,
  reorderScheduledExercises,
  updateScheduledExercise,
  updateScheduledWorkout,
} from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { WorkoutBuilder } from '@/components/calendar/workout-builder'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDayHeader } from '@/lib/calendar'
import type { WorkoutBuilderExerciseActions } from '@/lib/workout-builder-types'
import {
  scheduledWorkoutFormSchema,
  type ScheduledWorkoutFormValues,
} from '@/lib/validations/calendar'
import type {
  ClientScheduledWorkoutWithExercises,
  Exercise,
} from 'app/types/database'

type WorkoutBuilderModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  selectedDate: string
  workout: ClientScheduledWorkoutWithExercises
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  onChanged: () => void
  onCopy?: () => void
}

export function WorkoutBuilderModal({
  open,
  onOpenChange,
  clientId,
  selectedDate,
  workout,
  exercises,
  onChanged,
  onCopy,
}: WorkoutBuilderModalProps) {
  const [pending, setPending] = React.useState(false)

  const form = useForm<ScheduledWorkoutFormValues>({
    resolver: zodResolver(scheduledWorkoutFormSchema),
    values: {
      name: workout.name,
      notes: workout.notes ?? '',
    },
  })

  const exerciseActions = React.useMemo<WorkoutBuilderExerciseActions>(
    () => ({
      addExercise: (workoutId, values) =>
        addScheduledExercise(clientId, workoutId, values),
      updateExercise: (exerciseRowId, values) =>
        updateScheduledExercise(clientId, exerciseRowId, values),
      removeExercise: (exerciseRowId) =>
        removeScheduledExercise(clientId, exerciseRowId),
      reorderExercises: (workoutId, orderedRowIds) =>
        reorderScheduledExercises(clientId, workoutId, orderedRowIds),
    }),
    [clientId]
  )

  async function handleSave(
    values: ScheduledWorkoutFormValues,
    closeAfter = false
  ) {
    setPending(true)
    const result = await updateScheduledWorkout(clientId, workout.id, values)
    setPending(false)

    if (result.success) {
      toast.success(closeAfter ? 'Workout saved.' : 'Workout updated.')
      await onChanged()
      if (closeAfter) onOpenChange(false)
      return
    }

    toast.error(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92dvh,900px)] max-h-[92dvh] w-[min(96vw,1400px)] max-w-[96vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-[96vw]">
        <div className="shrink-0 border-b px-4 py-4 pr-12 sm:px-5 sm:pr-14">
          <DialogTitle className="sr-only">{workout.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Workout builder for {formatDayHeader(selectedDate)}
          </DialogDescription>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => handleSave(values, false))}
              className="space-y-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    {formatDayHeader(selectedDate)}
                  </p>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormControl>
                          <Input
                            {...field}
                            className="h-auto border-0 bg-transparent p-0 text-xl font-bold shadow-none focus-visible:ring-0"
                            placeholder="Workout name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center">
                  {onCopy && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="col-span-2 sm:col-span-1"
                      onClick={onCopy}
                    >
                      <Copy className="size-4" />
                      Copy day
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={form.handleSubmit((values) =>
                      handleSave(values, true)
                    )}
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    <span className="sm:hidden">Close</span>
                    <span className="hidden sm:inline">Save & close</span>
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Coach notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={2}
                        placeholder="Optional session notes for this day"
                        className="min-h-[52px] resize-none text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <WorkoutBuilder
            headerLabel={formatDayHeader(selectedDate)}
            workout={workout}
            exercises={exercises}
            exerciseActions={exerciseActions}
            catalogClientId={clientId}
            onChanged={onChanged}
            embedded
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
