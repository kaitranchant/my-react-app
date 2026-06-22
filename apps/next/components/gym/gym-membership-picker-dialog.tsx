'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'

export type GymMembershipItem = {
  id: string
  name: string
  gym_id: string | null
}

type ShareResult =
  | { success: true; count: number }
  | { success: false; error: string }

type GymMembershipPickerDialogProps = {
  gymId: string
  gymName: string
  items: GymMembershipItem[]
  triggerLabel: string
  title: string
  description: string
  itemLabelSingular: string
  itemLabelPlural: string
  onAddSelected: (ids: string[]) => Promise<ShareResult>
  onAddAll: () => Promise<ShareResult>
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function GymMembershipPickerDialog({
  gymId,
  gymName,
  items,
  triggerLabel,
  title,
  description,
  itemLabelSingular,
  itemLabelPlural,
  onAddSelected,
  onAddAll,
}: GymMembershipPickerDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState<
    'selected' | 'all' | null
  >(null)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])

  const addableItems = items.filter((item) => item.gym_id !== gymId)
  const alreadyMembers = items.filter((item) => item.gym_id === gymId)
  const allSelected =
    addableItems.length > 0 &&
    addableItems.every((item) => selectedIds.includes(item.id))

  React.useEffect(() => {
    if (!open) {
      setSelectedIds([])
      setPendingAction(null)
    }
  }, [open])

  function toggleItem(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    )
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([])
      return
    }

    setSelectedIds(addableItems.map((item) => item.id))
  }

  async function handleAddSelected() {
    setPendingAction('selected')
    const result = await onAddSelected(selectedIds)
    setPendingAction(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(
      `Added ${formatCount(result.count, itemLabelSingular, itemLabelPlural)} to ${gymName}.`
    )
    setOpen(false)
    router.refresh()
  }

  async function handleAddAll() {
    setPendingAction('all')
    const result = await onAddAll()
    setPendingAction(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(
      `Added ${formatCount(result.count, itemLabelSingular, itemLabelPlural)} to ${gymName}.`
    )
    setOpen(false)
    router.refresh()
  }

  const pending = pendingAction !== null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={items.length === 0}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You do not have any {itemLabelPlural} to add.
          </p>
        ) : (
          <div className="space-y-4">
            {addableItems.length > 0 ? (
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    className="size-4 rounded border"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={pending}
                  />
                  Select all ({addableItems.length})
                </label>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {addableItems.map((item) => {
                    const checked = selectedIds.includes(item.id)
                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                            checked ? 'bg-muted' : 'hover:bg-muted/50'
                          )}
                        >
                          <input
                            type="checkbox"
                            className="size-4 rounded border"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            disabled={pending}
                          />
                          <span>{item.name}</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                All of your {itemLabelPlural} are already members of this gym.
              </p>
            )}

            {alreadyMembers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Already members ({alreadyMembers.length})
                </p>
                <ul className="flex flex-wrap gap-2">
                  {alreadyMembers.map((item) => (
                    <li key={item.id}>
                      <Badge variant="secondary">{item.name}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              disabled={pending || addableItems.length === 0}
              onClick={handleAddAll}
              className="w-full sm:w-auto"
            >
              {pendingAction === 'all'
                ? 'Adding…'
                : `Add all ${itemLabelPlural}`}
            </Button>
            <Button
              disabled={
                pending || selectedIds.length === 0 || addableItems.length === 0
              }
              onClick={handleAddSelected}
              className="w-full sm:w-auto"
            >
              {pendingAction === 'selected'
                ? 'Adding…'
                : `Add selected (${selectedIds.length})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
