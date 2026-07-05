'use client'

import * as React from 'react'
import Link from 'next/link'
import { BookmarkPlus } from 'lucide-react'
import { toast } from 'sonner'

import { savePlanMealToLibrary } from '@/app/(dashboard)/library/meal-plans/[planId]/actions'
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

type SaveMealToLibraryDialogProps = {
  mealPlanId: string
  mealId: string
  defaultName: string
  disabled?: boolean
}

export function SaveMealToLibraryDialog({
  mealPlanId,
  mealId,
  defaultName,
  disabled = false,
}: SaveMealToLibraryDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [name, setName] = React.useState(defaultName)
  const [savedMealId, setSavedMealId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setName(defaultName)
    setSavedMealId(null)
  }, [open, defaultName])

  async function handleSave() {
    setPending(true)
    const result = await savePlanMealToLibrary(mealPlanId, mealId, name.trim())
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setSavedMealId(result.libraryMealId)
    toast.success('Meal saved to library.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled}>
          <BookmarkPlus className="size-4" />
          Save to library
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to meal library</DialogTitle>
          <DialogDescription>
            Copy this meal into your library so you can reuse it in other plans.
          </DialogDescription>
        </DialogHeader>

        {savedMealId ? (
          <div className="grid gap-3">
            <p className="text-sm">Meal saved successfully.</p>
            <Button asChild variant="outline">
              <Link href={`/library/meals/${savedMealId}`}>View in library</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor={`save-library-name-${mealId}`}>Library meal name</Label>
            <Input
              id={`save-library-name-${mealId}`}
              value={name}
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}

        {!savedMealId ? (
          <DialogFooter>
            <Button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => void handleSave()}
            >
              {pending ? 'Saving…' : 'Save meal'}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
