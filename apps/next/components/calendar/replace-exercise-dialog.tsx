'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { replaceScheduledExercise } from '@/app/(dashboard)/clients/[clientId]/calendar/actions'
import { createExerciseRecord } from '@/app/(dashboard)/library/exercises/actions'
import {
  CustomExerciseTab,
  customExerciseQuickDefaults,
  customExerciseQuickSchema,
  type CustomExerciseQuickValues,
} from '@/components/calendar/custom-exercise-tab'
import { LibraryExerciseList } from '@/components/exercises/library-exercise-list'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Exercise } from 'app/types/database'

type ExerciseSource = 'library' | 'custom'

type ReplaceExerciseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  exerciseRowId: string
  currentExerciseName: string
  exercises: Pick<Exercise, 'id' | 'name' | 'muscle_group' | 'external_id'>[]
  onReplaced: () => void
}

export function ReplaceExerciseDialog({
  open,
  onOpenChange,
  clientId,
  exerciseRowId,
  currentExerciseName,
  exercises,
  onReplaced,
}: ReplaceExerciseDialogProps) {
  const [pending, setPending] = React.useState(false)
  const [source, setSource] = React.useState<ExerciseSource>('library')
  const [libraryExerciseId, setLibraryExerciseId] = React.useState('')
  const [libraryExercises, setLibraryExercises] = React.useState(exercises)

  const customForm = useForm<CustomExerciseQuickValues>({
    resolver: zodResolver(customExerciseQuickSchema),
    defaultValues: customExerciseQuickDefaults,
  })

  React.useEffect(() => {
    setLibraryExercises(exercises)
  }, [exercises])

  const customName = customForm.watch('name')

  function resetDialog() {
    setLibraryExerciseId('')
    setSource('library')
    customForm.reset(customExerciseQuickDefaults)
  }

  async function resolveExerciseId(): Promise<string | null> {
    if (source === 'library') {
      return libraryExerciseId || null
    }

    if (source === 'custom') {
      const parsedCustom = customExerciseQuickSchema.safeParse(
        customForm.getValues()
      )
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
        { clientId }
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

  async function handleReplace() {
    setPending(true)
    const exerciseId = await resolveExerciseId()
    if (!exerciseId) {
      setPending(false)
      return
    }

    const result = await replaceScheduledExercise(
      clientId,
      exerciseRowId,
      exerciseId
    )
    setPending(false)

    if (result.success) {
      toast.success('Exercise replaced.')
      resetDialog()
      onOpenChange(false)
      onReplaced()
      return
    }

    toast.error(result.error)
  }

  const canSubmit =
    source === 'library'
      ? Boolean(libraryExerciseId)
      : Boolean(customName?.trim())

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) resetDialog()
      }}
    >
      <DialogContent
        viewport
        className="flex max-h-[min(calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.5rem),820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>Replace exercise</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Replacing <span className="font-medium">{currentExerciseName}</span>
          </p>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
          <Tabs
            value={source}
            onValueChange={(value) => setSource(value as ExerciseSource)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="grid w-full shrink-0 grid-cols-2">
              <TabsTrigger value="library">Library</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>

            <TabsContent
              value="library"
              className="mt-3 min-h-0 flex-1 data-[state=inactive]:hidden"
            >
              <LibraryExerciseList
                exercises={libraryExercises}
                selectedId={libraryExerciseId || null}
                onSelect={(exerciseId) => setLibraryExerciseId(exerciseId)}
                className="min-h-[min(360px,48vh)]"
              />
            </TabsContent>

            <TabsContent
              value="custom"
              className="mt-3 min-h-0 flex-1 overflow-y-auto data-[state=inactive]:hidden"
            >
              <CustomExerciseTab form={customForm} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="shrink-0 border-t px-4 py-4 sm:px-6">
          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit || pending}
            onClick={() => void handleReplace()}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Replace exercise
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
