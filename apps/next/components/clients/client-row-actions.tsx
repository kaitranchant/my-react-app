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
import { ClientFormDialog } from '@/components/clients/client-form-dialog'
import {
  deleteClientRecord,
  setClientStatus,
} from '@/app/(dashboard)/clients/actions'
import { toastSuccessWithUndo } from '@/lib/toast-undo'
import type { Client } from 'app/types/database'

export function ClientRowActions({ client }: { client: Client }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  if (client.is_coach_self) {
    return null
  }

  async function handleStatus(archive: boolean) {
    setPending(true)
    const result = await setClientStatus(
      client.id,
      archive ? 'archived' : 'active'
    )
    setPending(false)
    if (result.success) {
      if (archive) {
        toastSuccessWithUndo('Client archived', async () => {
          const undoResult = await setClientStatus(client.id, 'active')
          if (undoResult.success) {
            toast.success('Client restored')
            router.refresh()
          } else {
            toast.error(undoResult.error)
          }
        })
      } else {
        toast.success('Client restored')
      }
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete ${client.full_name}? This permanently removes the client and cannot be undone.`
      )
    ) {
      return
    }
    setPending(true)
    const result = await deleteClientRecord(client.id)
    setPending(false)
    if (result.success) {
      toast.success('Client deleted')
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
          {client.status === 'archived' ? (
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

      <ClientFormDialog
        client={client}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
