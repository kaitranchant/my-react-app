'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Dumbbell, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { createExerciseRecord } from '@/app/(dashboard)/library/exercises/actions'
import { ensureCatalogExercise } from '@/app/(dashboard)/library/exercises/catalog-actions'
import {
  customExerciseQuickDefaults,
  customExerciseQuickSchema,
  type CustomExerciseQuickValues,
} from '@/components/calendar/custom-exercise-tab'
import {
  ExerciseLibraryPanel,
  type LibrarySelection,
} from '@/components/calendar/exercise-library-panel'
import { ExercisePrescriptionForm } from '@/components/calendar/exercise-prescription-form'
import { WorkoutArrangementPanel } from '@/components/calendar/workout-arrangement-panel'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { exerciseDbImageUrl } from '@/lib/exercisedb'
import {
  defaultPrescriptionValues,
  rowToPrescriptionValues,
  scheduledExercisePrescriptionSchema,
  scheduledExerciseUpdateSchema,
  type ScheduledExercisePrescriptionValues,
} from '@/lib/validations/calendar'
import type {
  EditableWorkoutWithExercises,
  WorkoutBuilderExerciseActions,
} from '@/lib/workout-builder-types'
import type { Exercise } from 'app/types/database'

type BuilderMode = 'idle' | 'add' | 'edit'

type WorkoutBuilderProps = {
  headerLabel: string
  workout: EditableWorkoutWithExercises
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  exerciseActions: WorkoutBuilderExerciseActions
  catalogClientId?: string
  onChanged: () => void
  onCopy?: () => void
  /** When true, hides the top header (used inside WorkoutBuilderModal). */
  embedded?: boolean
}

function selectionLabel(selection: LibrarySelection | null): string | null {
  if (!selection) return null
  if (selection.source === 'catalog') return selection.exercise.name
  if (selection.source === 'library') return selection.name
  return selection.name
}

export function WorkoutBuilder({
  headerLabel,
  workout,
  exercises,
  exerciseActions,
  catalogClientId,
  onChanged,
  onCopy,
  embedded = false,
}: WorkoutBuilderProps) {
  const router = useRouter()
  const [mode, setMode] = React.useState<BuilderMode>('idle')
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null)
  const [librarySelection, setLibrarySelection] =
    React.useState<LibrarySelection | null>(null)
  const [libraryExercises, setLibraryExercises] = React.useState(exercises)
  const [pending, setPending] = React.useState(false)
  const [mobileTab, setMobileTab] = React.useState('library')

  React.useEffect(() => {
    setLibraryExercises(exercises)
  }, [exercises])

  const selectedRow = React.useMemo(
    () => workout.exercises.find((row) => row.id === selectedRowId) ?? null,
    [workout.exercises, selectedRowId]
  )

  const addForm = useForm<ScheduledExercisePrescriptionValues>({
    resolver: zodResolver(scheduledExercisePrescriptionSchema),
    defaultValues: defaultPrescriptionValues,
  })

  const editForm = useForm<ScheduledExercisePrescriptionValues>({
    resolver: zodResolver(scheduledExerciseUpdateSchema),
    values: selectedRow ? rowToPrescriptionValues(selectedRow) : defaultPrescriptionValues,
  })

  const customForm = useForm<CustomExerciseQuickValues>({
    resolver: zodResolver(customExerciseQuickSchema),
    defaultValues: customExerciseQuickDefaults,
  })

  function startAddMode() {
    setMode('add')
    setSelectedRowId(null)
    setLibrarySelection(null)
    addForm.reset(defaultPrescriptionValues)
    customForm.reset(customExerciseQuickDefaults)
    setMobileTab('library')
  }

  function handleSelectRow(rowId: string | null) {
    if (rowId) {
      setMode('edit')
      setSelectedRowId(rowId)
      setLibrarySelection(null)
      setMobileTab('prescription')
    } else {
      setMode('idle')
      setSelectedRowId(null)
    }
  }

  function handleLibrarySelect(selection: LibrarySelection) {
    setLibrarySelection(selection)
    setMode('add')
    setSelectedRowId(null)
    addForm.reset(defaultPrescriptionValues)
    setMobileTab('prescription')
  }

  async function resolveExerciseId(): Promise<string | null> {
    if (librarySelection?.source === 'library') {
      return librarySelection.exerciseId
    }

    if (librarySelection?.source === 'catalog') {
      const ensured = await ensureCatalogExercise(
        librarySelection.exercise.externalId,
        catalogClientId
      )
      if (!ensured.success) {
        toast.error(ensured.error)
        return null
      }
      return ensured.exerciseId
    }

    if (
      librarySelection?.source === 'custom' ||
      customForm.getValues('name').trim()
    ) {
      const customValues = customForm.getValues()
      const parsedCustom = customExerciseQuickSchema.safeParse(customValues)
      if (!parsedCustom.success) {
        toast.error('Enter an exercise name to continue.')
        return null
      }

      const created = await createExerciseRecord(
        {
          name: parsedCustom.data.name,
          instructions: parsedCustom.data.instructions ?? '',
          muscleGroup: parsedCustom.data.muscleGroup ?? '',
          equipment: parsedCustom.data.equipment ?? '',
          status: parsedCustom.data.saveToLibrary ? 'active' : 'archived',
        },
        catalogClientId ? { clientId: catalogClientId } : undefined
      )

      if (!created.success) {
        toast.error(created.error)
        return null
      }

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

      return created.exerciseId
    }

    return null
  }

  async function handleAdd(values: ScheduledExercisePrescriptionValues) {
    setPending(true)
    const exerciseId = await resolveExerciseId()
    if (!exerciseId) {
      setPending(false)
      return
    }

    const result = await exerciseActions.addExercise(workout.id, {
      exerciseId,
      ...values,
    })
    setPending(false)

    if (result.success) {
      toast.success('Exercise added.')
      startAddMode()
      router.refresh()
      onChanged()
      setMobileTab('workout')
      return
    }

    toast.error(result.error)
  }

  async function handleUpdate(values: ScheduledExercisePrescriptionValues) {
    if (!selectedRowId) return

    setPending(true)
    const result = await exerciseActions.updateExercise(selectedRowId, values)
    setPending(false)

    if (result.success) {
      toast.success('Exercise updated.')
      onChanged()
      return
    }

    toast.error(result.error)
  }

  const activeExerciseName =
    mode === 'edit' && selectedRow
      ? selectedRow.exercise.name
      : selectionLabel(librarySelection)

  const catalogExternalId =
    librarySelection?.source === 'catalog'
      ? librarySelection.exercise.externalId
      : selectedRow
        ? (libraryExercises.find((e) => e.id === selectedRow.exercise.id)
            ?.external_id ?? null)
        : null

  const canAdd =
    mode === 'add' &&
    librarySelection &&
    (librarySelection.source !== 'custom' ||
      Boolean(customForm.watch('name')?.trim()))

  const panelHeader = (
    <div className="border-brand bg-brand/5 flex flex-wrap items-center justify-between gap-3 border-l-4 px-4 py-3">
      <div>
        <p className="text-muted-foreground text-xs font-medium">
          {headerLabel}
        </p>
        <h3 className="text-lg font-semibold tracking-tight">{workout.name}</h3>
        <p className="text-muted-foreground text-xs">
          {workout.exercises.length} exercise
          {workout.exercises.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onCopy && (
          <Button type="button" variant="outline" size="sm" onClick={onCopy}>
            <Copy className="size-4" />
            Copy day
          </Button>
        )}
      </div>
    </div>
  )

  const libraryPanel = (
    <ExerciseLibraryPanel
      exercises={libraryExercises}
      selection={librarySelection}
      onSelect={handleLibrarySelect}
      customForm={customForm}
      className="h-full min-h-0"
    />
  )

  const prescriptionPanel = (
    <div className="flex min-h-0 flex-1 flex-col">
      {mode === 'idle' && (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-full">
            <Dumbbell className="text-muted-foreground size-6" />
          </div>
          <p className="font-medium">Configure an exercise</p>
          <p className="text-muted-foreground mt-1 max-w-xs text-sm">
            Pick an exercise from the library, or click one in the workout list to
            edit its prescription.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={startAddMode}
          >
            Browse exercises
          </Button>
        </div>
      )}

      {mode === 'add' && (
        <div className="flex min-h-0 flex-1 flex-col">
          {activeExerciseName ? (
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-3">
                {catalogExternalId && (
                  <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={exerciseDbImageUrl(catalogExternalId)}
                      alt=""
                      className="size-12 object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    Adding exercise
                  </p>
                  <p className="font-semibold">{activeExerciseName}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b px-4 py-3">
              <p className="text-muted-foreground text-sm">
                Select an exercise from the library to configure sets and reps.
              </p>
            </div>
          )}

          <Form {...addForm}>
            <form
              onSubmit={addForm.handleSubmit(handleAdd)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <ExercisePrescriptionForm form={addForm} idPrefix="builder-add" />
              </div>
              <div className="shrink-0 border-t px-4 py-3">
                <Button
                  type="submit"
                  disabled={pending || !canAdd}
                  className="w-full"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Add to workout
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}

      {mode === 'edit' && selectedRow && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-3">
              {catalogExternalId && (
                <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={exerciseDbImageUrl(catalogExternalId)}
                    alt=""
                    className="size-12 object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Editing exercise
                </p>
                <p className="font-semibold">{selectedRow.exercise.name}</p>
              </div>
            </div>
          </div>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleUpdate)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <ExercisePrescriptionForm form={editForm} idPrefix="builder-edit" />
              </div>
              <div className="flex shrink-0 gap-2 border-t px-4 py-3">
                <Button type="submit" disabled={pending} className="flex-1">
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSelectRow(null)}
                >
                  Done
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )

  const arrangementPanel = (
    <WorkoutArrangementPanel
      workout={workout}
      exerciseActions={exerciseActions}
      selectedRowId={selectedRowId}
      onSelectRow={handleSelectRow}
      onChanged={onChanged}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!embedded ? panelHeader : null}

      {/* Desktop: 3-panel layout */}
      <div className="hidden h-full min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(200px,260px)]">
        <div className="flex min-h-0 flex-col border-r">
          <p className="text-muted-foreground shrink-0 border-b px-4 py-2.5 text-xs font-medium">
            Exercise library
          </p>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
            {libraryPanel}
          </div>
        </div>

        <div className="flex min-h-0 flex-col border-r">
          <p className="text-muted-foreground shrink-0 border-b px-4 py-2.5 text-xs font-medium">
            Prescription
          </p>
          {prescriptionPanel}
        </div>

        <div className="flex min-h-0 flex-col">
          <p className="text-muted-foreground shrink-0 border-b px-4 py-2.5 text-xs font-medium">
            Workout order
          </p>
          {arrangementPanel}
        </div>
      </div>

      {/* Mobile / tablet: tabbed panels */}
      <div className="h-full min-h-0 flex-1 lg:hidden">
        <Tabs value={mobileTab} onValueChange={setMobileTab}>
          <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
            <TabsTrigger value="library" className="text-xs">
              Library
            </TabsTrigger>
            <TabsTrigger value="prescription" className="text-xs">
              Configure
            </TabsTrigger>
            <TabsTrigger value="workout" className="text-xs">
              Workout ({workout.exercises.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0 flex min-h-[420px] flex-col overflow-hidden px-4 py-3">
            {libraryPanel}
          </TabsContent>
          <TabsContent value="prescription" className="mt-0 min-h-[400px]">
            {prescriptionPanel}
          </TabsContent>
          <TabsContent value="workout" className="mt-0 min-h-[300px]">
            {arrangementPanel}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
