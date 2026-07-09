'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Dumbbell, Layers, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { createExerciseRecord } from '@/app/(dashboard)/library/exercises/actions'
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
import { ReplaceExerciseDialog } from '@/components/calendar/replace-exercise-dialog'
import { WorkoutArrangementPanel } from '@/components/calendar/workout-arrangement-panel'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { exerciseDbImageUrl } from '@/lib/exercise-catalog'
import { getNextSupersetGroup, getSupersetColor } from '@/lib/superset-groups'
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
import { cn } from '@/lib/utils'
import type { Exercise } from 'app/types/database'
import type { ScheduledWorkoutExerciseWithDetails } from 'app/types/database'

type BuilderMode = 'idle' | 'add' | 'add-superset' | 'edit'

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
  const [mode, setMode] = React.useState<BuilderMode>('idle')
  const [selectedRowId, setSelectedRowId] = React.useState<string | null>(null)
  const [librarySelection, setLibrarySelection] =
    React.useState<LibrarySelection | null>(null)
  const [libraryExercises, setLibraryExercises] = React.useState(exercises)
  const [pending, setPending] = React.useState(false)
  const [mobileTab, setMobileTab] = React.useState('library')
  const [activeSupersetGroup, setActiveSupersetGroup] = React.useState<string | null>(
    null
  )
  const [addPrescriptionKey, setAddPrescriptionKey] = React.useState(0)
  const [replacingRow, setReplacingRow] =
    React.useState<ScheduledWorkoutExerciseWithDetails | null>(null)

  React.useEffect(() => {
    setLibraryExercises(exercises)
  }, [exercises])

  const addForm = useForm<ScheduledExercisePrescriptionValues>({
    resolver: zodResolver(scheduledExercisePrescriptionSchema),
    defaultValues: defaultPrescriptionValues,
  })

  React.useEffect(() => {
    if (mode !== 'add-superset' || !activeSupersetGroup) return
    addForm.setValue('supersetGroup', activeSupersetGroup)
  }, [mode, activeSupersetGroup, addForm])

  const selectedRow = React.useMemo(
    () => workout.exercises.find((row) => row.id === selectedRowId) ?? null,
    [workout.exercises, selectedRowId]
  )

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
    setActiveSupersetGroup(null)
    setSelectedRowId(null)
    setLibrarySelection(null)
    addForm.reset(defaultPrescriptionValues)
    customForm.reset(customExerciseQuickDefaults)
    setMobileTab('library')
    setAddPrescriptionKey((key) => key + 1)
  }

  function startSupersetMode() {
    const group = getNextSupersetGroup(workout.exercises)
    setMode('add-superset')
    setActiveSupersetGroup(group)
    setSelectedRowId(null)
    setLibrarySelection(null)
    addForm.reset({ ...defaultPrescriptionValues, supersetGroup: group })
    customForm.reset(customExerciseQuickDefaults)
    setMobileTab('library')
    setAddPrescriptionKey((key) => key + 1)
  }

  function finishSupersetMode() {
    if (activeSupersetGroup) {
      const count = workout.exercises.filter(
        (row) => row.superset_group === activeSupersetGroup
      ).length
      if (count === 1) {
        toast.message('Superset has one exercise', {
          description: 'Add another exercise or remove the group from the workout order panel.',
        })
      }
    }
    setMode('idle')
    setActiveSupersetGroup(null)
    setLibrarySelection(null)
    addForm.reset(defaultPrescriptionValues)
    setMobileTab('workout')
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
    if (mode !== 'add-superset') {
      setMode('add')
    }
    setSelectedRowId(null)
    if (mode === 'add-superset' && activeSupersetGroup) {
      addForm.reset({ ...defaultPrescriptionValues, supersetGroup: activeSupersetGroup })
    } else {
      addForm.reset(defaultPrescriptionValues)
    }
    setMobileTab('prescription')
  }

  async function resolveExerciseId(): Promise<string | null> {
    if (librarySelection?.source === 'library') {
      return librarySelection.exerciseId
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
          demoVideoUrl: parsedCustom.data.demoVideoUrl ?? '',
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
      toast.success(
        mode === 'add-superset' ? 'Exercise added to superset.' : 'Exercise added.'
      )
      if (mode === 'add-superset' && activeSupersetGroup) {
        setLibrarySelection(null)
        addForm.reset({
          ...defaultPrescriptionValues,
          supersetGroup: activeSupersetGroup,
        })
        setAddPrescriptionKey((key) => key + 1)
        setMobileTab('library')
      } else {
        startAddMode()
        setMobileTab('workout')
      }
      onChanged()
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

  const selectedExerciseExternalId =
    librarySelection?.source === 'library'
      ? (libraryExercises.find((e) => e.id === librarySelection.exerciseId)
          ?.external_id ?? null)
      : selectedRow
        ? (libraryExercises.find((e) => e.id === selectedRow.exercise.id)
            ?.external_id ?? null)
        : null

  const canAdd =
    (mode === 'add' || mode === 'add-superset') &&
    librarySelection &&
    (librarySelection.source !== 'custom' ||
      Boolean(customForm.watch('name')?.trim()))

  const supersetExerciseCount =
    activeSupersetGroup == null
      ? 0
      : workout.exercises.filter((row) => row.superset_group === activeSupersetGroup)
          .length

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

  const prescriptionPanel = (compact = false) => (
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={startSupersetMode}
          >
            <Layers className="size-4" />
            Add superset
          </Button>
        </div>
      )}

      {(mode === 'add' || mode === 'add-superset') && (
        <div className="flex min-h-0 flex-1 flex-col">
          {mode === 'add-superset' && activeSupersetGroup && (
            <div
              className={cn(
                'flex items-center justify-between gap-3 border-b px-4 py-3 text-white',
                getSupersetColor(activeSupersetGroup)
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide uppercase opacity-90">
                  Building superset {activeSupersetGroup}
                </p>
                <p className="text-sm opacity-90">
                  {supersetExerciseCount === 0
                    ? 'Add at least 2 exercises performed back-to-back.'
                    : `${supersetExerciseCount} exercise${supersetExerciseCount === 1 ? '' : 's'} in this group`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0"
                onClick={finishSupersetMode}
              >
                Done
              </Button>
            </div>
          )}

          {activeExerciseName ? (
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-3">
                {selectedExerciseExternalId && (
                  <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={exerciseDbImageUrl(selectedExerciseExternalId)}
                      alt=""
                      className="size-12 object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs font-medium">
                    {mode === 'add-superset' ? 'Adding to superset' : 'Adding exercise'}
                  </p>
                  <p className="font-semibold">{activeExerciseName}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b px-4 py-3">
              <p className="text-muted-foreground text-sm">
                {mode === 'add-superset'
                  ? 'Select exercises from the library — each will join this superset.'
                  : 'Select an exercise from the library to configure sets and reps.'}
              </p>
            </div>
          )}

          <Form {...addForm}>
            <form
              onSubmit={addForm.handleSubmit(handleAdd)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
                <ExercisePrescriptionForm
                  key={`builder-add-${addPrescriptionKey}`}
                  form={addForm}
                  idPrefix="builder-add"
                  compact={compact}
                  hideSupersetGroup={mode === 'add-superset'}
                />
              </div>
              <div className="shrink-0 space-y-2 border-t px-4 py-3">
                <Button
                  type="submit"
                  disabled={pending || !canAdd}
                  className="w-full"
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {mode === 'add-superset' ? 'Add to superset' : 'Add to workout'}
                </Button>
                {mode === 'add-superset' && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={finishSupersetMode}
                  >
                    Finish superset
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      )}

      {mode === 'edit' && selectedRow && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-4 py-3">
            <div className="flex items-center gap-3">
              {selectedExerciseExternalId && (
                <div className="bg-muted size-12 shrink-0 overflow-hidden rounded-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={exerciseDbImageUrl(selectedExerciseExternalId)}
                    alt=""
                    className="size-12 object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-xs font-medium">
                  Editing exercise
                </p>
                <p className="font-semibold">{selectedRow.exercise.name}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setReplacingRow(selectedRow)}
              >
                <RefreshCw className="size-3.5" />
                Replace
              </Button>
            </div>
          </div>

          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleUpdate)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
                <ExercisePrescriptionForm
                  key={selectedRowId ?? 'builder-edit'}
                  form={editForm}
                  idPrefix="builder-edit"
                  compact={compact}
                />
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
      onStartSuperset={startSupersetMode}
      onReplaceExercise={setReplacingRow}
      activeSupersetGroup={mode === 'add-superset' ? activeSupersetGroup : null}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {!embedded ? panelHeader : null}

      {replacingRow ? (
        <ReplaceExerciseDialog
          open
          onOpenChange={(next) => {
            if (!next) setReplacingRow(null)
          }}
          exerciseRowId={replacingRow.id}
          currentExerciseName={replacingRow.exercise.name}
          exercises={libraryExercises}
          catalogClientId={catalogClientId}
          onReplace={exerciseActions.replaceExercise}
          onReplaced={() => {
            setReplacingRow(null)
            onChanged()
          }}
        />
      ) : null}

      {/* Desktop + tablet: 3-panel layout */}
      <div className="hidden min-h-0 flex-1 md:grid md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)_minmax(200px,260px)] md:overflow-hidden">
        <div className="flex min-h-0 flex-col overflow-hidden border-r">
          <p className="text-muted-foreground shrink-0 border-b px-4 py-2.5 text-xs font-medium">
            Exercise library
          </p>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
            {libraryPanel}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden border-r">
          <p className="text-muted-foreground shrink-0 border-b px-4 py-2.5 text-xs font-medium">
            Prescription
          </p>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {prescriptionPanel(false)}
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          <p className="text-muted-foreground shrink-0 border-b px-4 py-2.5 text-xs font-medium">
            Workout order
          </p>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {arrangementPanel}
          </div>
        </div>
      </div>

      {/* Phone only: tabbed panels */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:hidden">
        <Tabs
          value={mobileTab}
          onValueChange={setMobileTab}
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden"
        >
          <TabsList className="mx-2 mt-3 shrink-0 grid w-auto grid-cols-3 sm:mx-4">
            <TabsTrigger value="library" className="px-2 text-xs">
              Library
            </TabsTrigger>
            <TabsTrigger value="prescription" className="px-2 text-xs">
              Configure
            </TabsTrigger>
            <TabsTrigger value="workout" className="px-2 text-xs">
              Workout ({workout.exercises.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="library"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 data-[state=inactive]:hidden"
          >
            {libraryPanel}
          </TabsContent>
          <TabsContent
            value="prescription"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            {prescriptionPanel(true)}
          </TabsContent>
          <TabsContent
            value="workout"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            {arrangementPanel}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
