'use client'

import * as React from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteAssessmentTemplate } from '@/app/(dashboard)/library/assessment-templates/actions'
import { AssessmentTemplateFormDialog } from '@/components/assessment-templates/assessment-template-form-dialog'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type {
  AssessmentItem,
  AssessmentTemplateWithItems,
} from 'app/types/database'

export function AssessmentTemplateRowActions({
  template,
  catalog,
  onUpdated,
  onDeleted,
}: {
  template: AssessmentTemplateWithItems
  catalog: AssessmentItem[]
  onUpdated: (template: AssessmentTemplateWithItems) => void
  onDeleted: (templateId: string) => void
}) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const deleteConfirm = useConfirmDialog({
    title: `Delete ${template.name}?`,
    description:
      'This removes the reusable template. Previously completed assessments are not affected.',
    confirmLabel: 'Delete template',
    destructive: true,
    onConfirm: async () => {
      setPending(true)
      const result = await deleteAssessmentTemplate(template.id)
      setPending(false)
      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }
      toast.success('Assessment template deleted')
      onDeleted(template.id)
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={pending}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Template actions</span>
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

      <AssessmentTemplateFormDialog
        catalog={catalog}
        template={template}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={onUpdated}
      />
      {deleteConfirm.dialog}
    </>
  )
}
