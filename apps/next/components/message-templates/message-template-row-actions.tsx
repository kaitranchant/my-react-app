'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteMessageTemplateRecord } from '@/app/(dashboard)/library/message-templates/actions'
import { MessageTemplateFormDialog } from '@/components/message-templates/message-template-form-dialog'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CoachMessageTemplate } from 'app/types/database'

export function MessageTemplateRowActions({
  template,
}: {
  template: CoachMessageTemplate
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const deleteConfirm = useConfirmDialog({
    title: `Delete ${template.name}?`,
    description: 'This permanently removes the template.',
    confirmLabel: 'Delete template',
    destructive: true,
    onConfirm: async () => {
      setPending(true)
      const result = await deleteMessageTemplateRecord(template.id)
      setPending(false)
      if (result.success) {
        toast.success('Template deleted')
        router.refresh()
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
  })

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
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={deleteConfirm.open}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MessageTemplateFormDialog
        template={template}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      {deleteConfirm.dialog}
    </>
  )
}
