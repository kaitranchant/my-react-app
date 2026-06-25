'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WorkoutFormDialog } from '@/components/workouts/workout-form-dialog'
import {
  deleteWorkoutRecord,
  setWorkoutStatus,
} from '@/app/(dashboard)/library/workouts/actions'
import type { Workout } from 'app/types/database'

export function WorkoutRowActions({ workout }: { workout: Workout }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const deleteConfirm = useConfirmDialog({
    title: `Delete ${workout.name}?`,
    description: 'This permanently removes the workout.',
    confirmLabel: 'Delete workout',
    destructive: true,
    onConfirm: async () => {
      setPending(true)
      const result = await deleteWorkoutRecord(workout.id)
      setPending(false)
      if (result.success) {
        toast.success('Workout deleted')
        router.refresh()
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
  })

  async function handleStatus(archive: boolean) {
    setPending(true)
    const result = await setWorkoutStatus(
      workout.id,
      archive ? 'archived' : 'active'
    )
    setPending(false)
    if (result.success) {
      toast.success(archive ? 'Workout archived' : 'Workout restored')
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
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          {workout.status === 'archived' ? (
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
          <DropdownMenuItem variant="destructive" onSelect={deleteConfirm.open}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkoutFormDialog
        workout={workout}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      {deleteConfirm.dialog}
    </>
  )
}
