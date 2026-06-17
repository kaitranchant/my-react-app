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
import { ProgramFormDialog } from '@/components/programs/program-form-dialog'
import {
  deleteProgramRecord,
  setProgramStatus,
} from '@/app/(dashboard)/library/programs/actions'
import type { Program } from 'app/types/database'

export function ProgramRowActions({ program }: { program: Program }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  async function handleStatus(archive: boolean) {
    setPending(true)
    const result = await setProgramStatus(
      program.id,
      archive ? 'archived' : 'active'
    )
    setPending(false)
    if (result.success) {
      toast.success(archive ? 'Program archived' : 'Program restored')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete ${program.name}? This removes the program and any assignment history.`
      )
    ) {
      return
    }
    setPending(true)
    const result = await deleteProgramRecord(program.id)
    setPending(false)
    if (result.success) {
      toast.success('Program deleted')
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
          {program.status === 'archived' ? (
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

      <ProgramFormDialog
        program={program}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
