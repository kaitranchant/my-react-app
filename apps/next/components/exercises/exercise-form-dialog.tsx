'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  createExerciseRecord,
  updateExerciseRecord,
} from '@/app/(dashboard)/library/exercises/actions'
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
  exerciseFormDefaults,
  exerciseFormSchema,
  type ExerciseFormValues,
} from '@/lib/validations/exercise'
import { ExerciseDemoVideoUpload } from '@/components/exercises/exercise-demo-video-upload'
import type { Exercise } from 'app/types/database'

type ExerciseFormDialogProps = {
  exercise?: Exercise
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ExerciseFormDialog({
  exercise,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ExerciseFormDialogProps) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const isEdit = Boolean(exercise)

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: exercise
      ? {
          name: exercise.name,
          instructions: exercise.instructions ?? '',
          muscleGroup: exercise.muscle_group ?? '',
          equipment: exercise.equipment ?? '',
          status: exercise.status,
        }
      : exerciseFormDefaults,
  })

  React.useEffect(() => {
    if (open) {
      form.reset(
        exercise
          ? {
              name: exercise.name,
              instructions: exercise.instructions ?? '',
              muscleGroup: exercise.muscle_group ?? '',
              equipment: exercise.equipment ?? '',
              status: exercise.status,
            }
          : exerciseFormDefaults
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exercise])

  async function onSubmit(values: ExerciseFormValues) {
    const result = isEdit
      ? await updateExerciseRecord(exercise!.id, values)
      : await createExerciseRecord(values)

    if (result.success) {
      toast.success(isEdit ? 'Exercise updated' : 'Exercise created')
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
            {isEdit ? 'Edit exercise' : 'New exercise'}
          </DialogTitle>
          <DialogDescription>
            Add movements to your library — reuse them when building workouts.
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
                    <Input placeholder="Barbell back squat" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="muscleGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Muscle group</FormLabel>
                    <FormControl>
                      <Input placeholder="Quads, glutes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="equipment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment</FormLabel>
                    <FormControl>
                      <Input placeholder="Barbell, rack" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Setup, cues, and form notes…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit && exercise ? (
              <ExerciseDemoVideoUpload
                exerciseId={exercise.id}
                demoVideoPath={exercise.demo_video_path}
              />
            ) : null}
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
                    : 'Create exercise'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function AddExerciseButton() {
  return (
    <ExerciseFormDialog
      trigger={
        <Button>
          <Plus className="size-4" />
          New exercise
        </Button>
      }
    />
  )
}
