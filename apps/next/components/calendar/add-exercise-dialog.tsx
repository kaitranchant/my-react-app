'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { addScheduledExercise } from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { createExerciseRecord } from '@/app/(dashboard)/library/exercises/actions'
import {
  CustomExerciseTab,
  customExerciseQuickDefaults,
  customExerciseQuickSchema,
  type CustomExerciseQuickValues,
} from '@/components/calendar/custom-exercise-tab'
import { ExercisePrescriptionForm } from '@/components/calendar/exercise-prescription-form'
import { LibraryExerciseList } from '@/components/exercises/library-exercise-list'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  defaultPrescriptionValues,
  scheduledExercisePrescriptionSchema,
  type ScheduledExercisePrescriptionValues,
} from '@/lib/validations/calendar'
import { cn } from '@/lib/utils'
import type { Exercise } from 'app/types/database'

type AddExerciseDialogProps = {
  clientId: string
  workoutId: string
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  onAdded: () => void
}

type ExerciseSource = 'library' | 'custom'

function useCompactLayout() {
  const [compact, setCompact] = React.useState(false)

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)')
    const update = () => setCompact(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return compact
}

export function AddExerciseDialog({
  clientId,
  workoutId,
  exercises,
  onAdded,
}: AddExerciseDialogProps) {
  const router = useRouter()
  const compactLayout = useCompactLayout()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [source, setSource] = React.useState<ExerciseSource>('library')
  const [selectedName, setSelectedName] = React.useState<string | null>(null)
  const [libraryExercises, setLibraryExercises] = React.useState(exercises)

  const form = useForm<ScheduledExercisePrescriptionValues>({
    resolver: zodResolver(scheduledExercisePrescriptionSchema),
    defaultValues: defaultPrescriptionValues,
  })

  const customForm = useForm<CustomExerciseQuickValues>({
    resolver: zodResolver(customExerciseQuickSchema),
    defaultValues: customExerciseQuickDefaults,
  })

  React.useEffect(() => {
    setLibraryExercises(exercises)
  }, [exercises])

  const activeExercises = libraryExercises.filter((exercise) => exercise.id)
  const [libraryExerciseId, setLibraryExerciseId] = React.useState('')
  const customName = customForm.watch('name')

  function clearSelection() {
    setSelectedName(null)
    setLibraryExerciseId('')
    if (source === 'custom') {
      customForm.setValue('name', '')
    }
  }

  function resetDialog() {
    form.reset(defaultPrescriptionValues)
    customForm.reset(customExerciseQuickDefaults)
    setSelectedName(null)
    setLibraryExerciseId('')
    setSource('library')
  }

  function switchSource(next: ExerciseSource) {
    setSource(next)
    if (next === 'custom') {
      setLibraryExerciseId('')
      setSelectedName(customForm.getValues('name').trim() || null)
    }
  }

  async function onSubmit(values: ScheduledExercisePrescriptionValues) {
    setPending(true)

    let exerciseId = libraryExerciseId

    if (source === 'custom') {
      const customValues = customForm.getValues()
      const parsedCustom = customExerciseQuickSchema.safeParse(customValues)
      if (!parsedCustom.success) {
        setPending(false)
        toast.error('Enter an exercise name to continue.')
        return
      }

      const created = await createExerciseRecord(
        {
          name: parsedCustom.data.name,
          instructions: parsedCustom.data.instructions ?? '',
          muscleGroup: parsedCustom.data.muscleGroup ?? '',
          equipment: parsedCustom.data.equipment ?? '',
          demoVideoUrl: parsedCustom.data.demoVideoUrl ?? '',
          status: parsedCustom.data.saveToLibrary ? 'active' : 'archived',
        },
        { clientId }
      )

      if (!created.success) {
        setPending(false)
        toast.error(created.error)
        return
      }

      exerciseId = created.exerciseId

      if (parsedCustom.data.saveToLibrary) {
        setLibraryExercises((current) => [
          ...current,
          {
            id: created.exerciseId,
            name: parsedCustom.data.name,
            muscle_group: parsedCustom.data.muscleGroup?.trim() || null,
            external_id: null,
          },
        ])
      }
    }

    if (!exerciseId) {
      setPending(false)
      toast.error('Select or create an exercise first.')
      return
    }

    const result = await addScheduledExercise(clientId, workoutId, {
      exerciseId,
      ...values,
    })
    setPending(false)

    if (result.success) {
      toast.success('Exercise added.')
      resetDialog()
      setOpen(false)
      router.refresh()
      onAdded()
      return
    }

    toast.error(result.error)
  }

  function handleLibrarySelect(exerciseId: string, name: string) {
    setLibraryExerciseId(exerciseId)
    setSelectedName(name)
  }

  const canSubmit =
    source === 'library'
      ? Boolean(libraryExerciseId)
      : Boolean(customName?.trim())

  const selectionLabel =
    source === 'custom' ? customName?.trim() || null : selectedName

  const showConfigureView =
    source === 'library' ? Boolean(libraryExerciseId) : false

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add exercise</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        viewport
        className="flex h-[min(calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem),920px)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle>Add exercise</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!showConfigureView ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 sm:px-6">
              <Tabs
                value={source}
                onValueChange={(value) => switchSource(value as ExerciseSource)}
                className="flex min-h-0 flex-1 flex-col pt-3"
              >
                <TabsList className="grid h-9 w-full shrink-0 grid-cols-2">
                  <TabsTrigger value="library" className="px-1 text-xs sm:text-sm">
                    Library
                    {activeExercises.length > 0 ? ` (${activeExercises.length})` : ''}
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="px-1 text-xs sm:text-sm">
                    Custom
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="library"
                  className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
                >
                  <LibraryExerciseList
                    exercises={activeExercises}
                    selectedId={libraryExerciseId || null}
                    onSelect={handleLibrarySelect}
                    variant={compactLayout ? 'grid' : 'list'}
                    className={
                      compactLayout
                        ? 'flex min-h-0 flex-1 flex-col'
                        : 'min-h-[min(420px,52vh)]'
                    }
                  />
                </TabsContent>

                <TabsContent
                  value="custom"
                  className="mt-3 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
                >
                  <CustomExerciseTab form={customForm} />
                  {source === 'custom' && canSubmit && (
                    <div className="mt-4 border-t pt-4">
                      <Form {...form}>
                        <form
                          id="add-exercise-form"
                          onSubmit={form.handleSubmit(onSubmit)}
                          className="space-y-3"
                        >
                          <ExercisePrescriptionForm
                            form={form}
                            idPrefix="add-exercise"
                            compact={compactLayout}
                          />
                        </form>
                      </Form>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {!canSubmit ? (
                <p className="text-muted-foreground shrink-0 py-3 text-center text-sm">
                  Select an exercise to configure sets and reps.
                </p>
              ) : source === 'custom' ? (
                <div className="shrink-0 border-t py-3">
                  <Button
                    type="submit"
                    form="add-exercise-form"
                    disabled={pending}
                    className="w-full"
                  >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    Add to workout
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Selected exercise</p>
                  <p className="truncate font-semibold">{selectionLabel}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={clearSelection}
                >
                  Change
                </Button>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-6">
                <Form {...form}>
                  <form
                    id="add-exercise-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex min-h-0 flex-1 flex-col overflow-hidden"
                  >
                    <ExercisePrescriptionForm
                      form={form}
                      idPrefix="add-exercise"
                      compact={compactLayout}
                    />
                  </form>
                </Form>
              </div>

              <div className="shrink-0 border-t px-4 py-3 sm:px-6">
                <Button
                  type="submit"
                  form="add-exercise-form"
                  disabled={pending}
                  className="w-full"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Add to workout
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
