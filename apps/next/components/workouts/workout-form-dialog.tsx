'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  createWorkoutRecord,
  updateWorkoutRecord,
} from '@/app/(dashboard)/library/workouts/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  workoutFormDefaults,
  workoutFormSchema,
  type WorkoutFormValues,
} from '@/lib/validations/workout'
import type { Workout } from 'app/types/database'

type WorkoutFormDialogProps = {
  workout?: Workout
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function WorkoutFormDialog({
  workout,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: WorkoutFormDialogProps) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const isEdit = Boolean(workout)

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: workout
      ? {
          name: workout.name,
          description: workout.description ?? '',
          status: workout.status,
        }
      : workoutFormDefaults,
  })

  React.useEffect(() => {
    if (open) {
      form.reset(
        workout
          ? {
              name: workout.name,
              description: workout.description ?? '',
              status: workout.status,
            }
          : workoutFormDefaults
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workout])

  async function onSubmit(values: WorkoutFormValues) {
    const result = isEdit
      ? await updateWorkoutRecord(workout!.id, values)
      : await createWorkoutRecord(values)

    if (result.success) {
      toast.success(isEdit ? 'Workout updated' : 'Workout created')
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-semibold tracking-tight">
            {isEdit ? 'Edit workout' : 'New workout'}
          </DialogTitle>
          <DialogDescription>
            Create a reusable session template. You&apos;ll add exercises to it
            in a later step.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Upper body strength A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Session focus, structure, and coaching notes…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving…'
                  : isEdit
                    ? 'Save changes'
                    : 'Create workout'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function AddWorkoutButton() {
  return (
    <WorkoutFormDialog
      trigger={
        <Button>
          <Plus className="size-4" />
          New workout
        </Button>
      }
    />
  )
}
