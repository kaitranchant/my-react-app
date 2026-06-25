'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { createMealPlanRecord, updateMealPlanRecord } from '@/app/(dashboard)/library/meal-plans/actions'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  mealPlanFormSchema,
  type MealPlanFormValues,
} from '@/lib/validations/nutrition'
import type { MealPlan } from 'app/types/database'

export const mealPlanFormDefaults: MealPlanFormValues = {
  name: '',
  description: '',
  status: 'active',
}

type MealPlanFormDialogProps = {
  mealPlan?: MealPlan
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function MealPlanFormDialog({
  mealPlan,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: MealPlanFormDialogProps) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const isEdit = Boolean(mealPlan)
  const [pending, setPending] = React.useState(false)

  const form = useForm<MealPlanFormValues>({
    resolver: zodResolver(mealPlanFormSchema),
    defaultValues: mealPlan
      ? {
          name: mealPlan.name,
          description: mealPlan.description ?? '',
          status: mealPlan.status,
        }
      : mealPlanFormDefaults,
  })

  React.useEffect(() => {
    if (!open) return
    form.reset(
      mealPlan
        ? {
            name: mealPlan.name,
            description: mealPlan.description ?? '',
            status: mealPlan.status,
          }
        : mealPlanFormDefaults
    )
  }, [open, mealPlan, form])

  async function onSubmit(values: MealPlanFormValues) {
    setPending(true)
    const result = isEdit
      ? await updateMealPlanRecord(mealPlan!.id, values)
      : await createMealPlanRecord(values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(isEdit ? 'Meal plan updated.' : 'Meal plan created.')
    setOpen(false)

    if (!isEdit && 'mealPlanId' in result) {
      router.push(`/library/meal-plans/${result.mealPlanId}`)
    } else {
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit meal plan' : 'New meal plan'}</DialogTitle>
          <DialogDescription>
            Reusable meal plan templates you can assign to clients.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 4-week cut plan" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Optional notes for coaches"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending
                  ? isEdit
                    ? 'Saving…'
                    : 'Creating…'
                  : isEdit
                    ? 'Save changes'
                    : 'Create meal plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export function AddMealPlanButton() {
  return (
    <MealPlanFormDialog
      trigger={
        <Button>
          <Plus className="size-4" />
          New meal plan
        </Button>
      }
    />
  )
}
