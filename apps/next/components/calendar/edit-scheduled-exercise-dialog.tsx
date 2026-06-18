'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { updateScheduledExercise } from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { ExercisePrescriptionForm } from '@/components/calendar/exercise-prescription-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import {
  rowToPrescriptionValues,
  scheduledExerciseUpdateSchema,
  type ScheduledExercisePrescriptionValues,
} from '@/lib/validations/calendar'
import type { ScheduledWorkoutExerciseWithDetails } from 'app/types/database'

type EditScheduledExerciseDialogProps = {
  clientId: string
  row: ScheduledWorkoutExerciseWithDetails
  onChanged: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

export function EditScheduledExerciseDialog({
  clientId,
  row,
  onChanged,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
}: EditScheduledExerciseDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [pending, setPending] = React.useState(false)

  const form = useForm<ScheduledExercisePrescriptionValues>({
    resolver: zodResolver(scheduledExerciseUpdateSchema),
    values: rowToPrescriptionValues(row),
  })

  async function onSubmit(values: ScheduledExercisePrescriptionValues) {
    setPending(true)
    const result = await updateScheduledExercise(clientId, row.id, values)
    setPending(false)

    if (result.success) {
      toast.success('Exercise updated.')
      setOpen(false)
      onChanged()
      return
    }

    toast.error(result.error)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5">
            <Pencil className="size-4" />
            Edit
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{row.exercise.name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ExercisePrescriptionForm form={form} idPrefix={`edit-${row.id}`} />
            </div>
            <div className="flex gap-2 border-t pt-4">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
