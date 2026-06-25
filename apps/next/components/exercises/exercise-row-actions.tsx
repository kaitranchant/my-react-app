'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ExerciseFormDialog } from '@/components/exercises/exercise-form-dialog'
import {
  deleteExerciseRecord,
  getExerciseRecord,
  setExerciseStatus,
} from '@/app/(dashboard)/library/exercises/actions'
import type { Exercise } from 'app/types/database'

export function ExerciseRowActions({ exercise }: { exercise: Exercise }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [editExercise, setEditExercise] = React.useState<Exercise | null>(null)
  const [pending, setPending] = React.useState(false)

  async function openEditDialog() {
    setPending(true)
    const result = await getExerciseRecord(exercise.id)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setEditExercise(result.exercise)
    setEditOpen(true)
  }

  async function handleStatus(archive: boolean) {
    setPending(true)
    const result = await setExerciseStatus(
      exercise.id,
      archive ? 'archived' : 'active'
    )
    setPending(false)
    if (result.success) {
      toast.success(archive ? 'Exercise archived' : 'Exercise restored')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete ${exercise.name}? This permanently removes the exercise.`
      )
    ) {
      return
    }
    setPending(true)
    const result = await deleteExerciseRecord(exercise.id)
    setPending(false)
    if (result.success) {
      toast.success('Exercise deleted')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={pending}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void openEditDialog()}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          {exercise.status === 'archived' ? (
            <DropdownMenuItem onSelect={() => handleStatus(false)}>
              <ArchiveRestore className="size-4" />
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => handleStatus(true)}>
              <Archive className="size-4" />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editExercise ? (
        <ExerciseFormDialog
          exercise={editExercise}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  )
}
