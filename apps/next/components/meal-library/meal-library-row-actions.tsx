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
  deleteLibraryMealRecord,
  setLibraryMealStatus,
} from '@/app/(dashboard)/library/meals/actions'
import { Button } from '@/components/ui/button'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { LibraryMeal } from 'app/types/database'

export function MealLibraryRowActions({ meal }: { meal: LibraryMeal }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const deleteConfirm = useConfirmDialog({
    title: `Delete ${meal.name}?`,
    description: 'This removes the meal from your library. This cannot be undone.',
    confirmLabel: 'Delete meal',
    destructive: true,
    onConfirm: async () => {
      setPending(true)
      const result = await deleteLibraryMealRecord(meal.id)
      setPending(false)
      if (result.success) {
        toast.success('Meal deleted')
        router.refresh()
      } else {
        toast.error(result.error)
        throw new Error(result.error)
      }
    },
  })

  async function handleStatus(archive: boolean) {
    setPending(true)
    const result = await setLibraryMealStatus(
      meal.id,
      archive ? 'archived' : 'active'
    )
    setPending(false)
    if (result.success) {
      toast.success(archive ? 'Meal archived' : 'Meal restored')
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
            <Link href={`/library/meals/${meal.id}`}>
              <UtensilsCrossed className="size-4" />
              Edit meal
            </Link>
          </DropdownMenuItem>
          {meal.status === 'archived' ? (
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
      {deleteConfirm.dialog}
    </>
  )
}
