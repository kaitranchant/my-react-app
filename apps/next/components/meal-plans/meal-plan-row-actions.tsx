'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteMealPlanRecord,
  setMealPlanStatus,
} from '@/app/(dashboard)/library/meal-plans/actions'
import { MealPlanFormDialog } from '@/components/meal-plans/meal-plan-form-dialog'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MealPlan } from 'app/types/database'

export function MealPlanRowActions({ mealPlan }: { mealPlan: MealPlan }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const deleteConfirm = useConfirmDialog({
    title: `Delete ${mealPlan.name}?`,
    description:
      'This removes the plan and any assignment history. This cannot be undone.',
    confirmLabel: 'Delete plan',
    destructive: true,
    onConfirm: async () => {
      setPending(true)
      const result = await deleteMealPlanRecord(mealPlan.id)
      setPending(false)
      if (result.success) {
        toast.success('Meal plan deleted')
        router.refresh()
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
  })

  async function handleStatus(archive: boolean) {
    setPending(true)
    const result = await setMealPlanStatus(
      mealPlan.id,
      archive ? 'archived' : 'active'
    )
    setPending(false)
    if (result.success) {
      toast.success(archive ? 'Meal plan archived' : 'Meal plan restored')
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
          <DropdownMenuItem asChild>
            <Link href={`/library/meal-plans/${mealPlan.id}`}>
              <UtensilsCrossed className="size-4" />
              Edit days & meals
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          {mealPlan.status === 'archived' ? (
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
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => deleteConfirm.open()}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MealPlanFormDialog
        mealPlan={mealPlan}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      {deleteConfirm.dialog}
    </>
  )
}
