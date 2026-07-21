'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  createAssessmentTemplate,
  updateAssessmentTemplate,
} from '@/app/(dashboard)/library/assessment-templates/actions'
import { AssessmentItemPicker } from '@/components/clients/assessments/assessment-item-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  AssessmentItem,
  AssessmentTemplateWithItems,
} from 'app/types/database'

type AssessmentTemplateFormDialogProps = {
  catalog: AssessmentItem[]
  template?: AssessmentTemplateWithItems
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSaved?: (template: AssessmentTemplateWithItems) => void
}

export function AssessmentTemplateFormDialog({
  catalog: initialCatalog,
  template,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSaved,
}: AssessmentTemplateFormDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const [catalog, setCatalog] = React.useState(initialCatalog)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [pending, setPending] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const isEdit = Boolean(template)

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  React.useEffect(() => {
    if (!open) return
    setName(template?.name ?? '')
    setDescription(template?.description ?? '')
    setSelectedIds(
      template
        ? [...template.items]
        .sort((a, b) => a.sort_order - b.sort_order)
            .map((row) => row.assessment_item_id)
        : []
    )
  }, [open, template])

  function toggleItem(item: AssessmentItem) {
    setSelectedIds((current) =>
      current.includes(item.id)
        ? current.filter((id) => id !== item.id)
        : [...current, item.id]
    )
  }

  function handleItemCreated(item: AssessmentItem) {
    setCatalog((current) =>
      current.some((row) => row.id === item.id) ? current : [...current, item]
    )
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Enter a template name.')
      return
    }
    if (selectedIds.length === 0) {
      toast.error('Select at least one test.')
      return
    }

    setPending(true)
    const values = {
      name: name.trim(),
      description: description.trim() || null,
      assessmentItemIds: selectedIds,
    }
    const result = template
      ? await updateAssessmentTemplate(template.id, values)
      : await createAssessmentTemplate(values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(template ? 'Assessment template updated' : 'Assessment template created')
    onSaved?.(result.data)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit assessment template' : 'New assessment template'}
          </DialogTitle>
          <DialogDescription>
            Preselect the tests coaches should run. Scores are entered when the
            template is used with a client.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="assessment-template-name">Name</Label>
            <Input
              id="assessment-template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Initial movement assessment"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assessment-template-description">
              Description (optional)
            </Label>
            <Textarea
              id="assessment-template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Who this template is for and when to use it."
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Tests</Label>
              <span className="text-muted-foreground text-xs">
                {selectedIds.length} selected
              </span>
            </div>
            <AssessmentItemPicker
              items={catalog}
              selectedItemIds={new Set(selectedIds)}
              onToggleItem={toggleItem}
              onItemCreated={handleItemCreated}
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={pending}>
            {pending
              ? 'Saving…'
              : isEdit
                ? 'Save changes'
                : 'Create template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AddAssessmentTemplateButton({
  catalog,
  onSaved,
}: {
  catalog: AssessmentItem[]
  onSaved?: (template: AssessmentTemplateWithItems) => void
}) {
  return (
    <AssessmentTemplateFormDialog
      catalog={catalog}
      onSaved={onSaved}
      trigger={
        <Button>
          <Plus className="size-4" />
          New template
        </Button>
      }
    />
  )
}
