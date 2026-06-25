'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import {
  assignMealPlanToClient,
  cancelMealPlanAssignment,
} from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { CreateClientMealPlanDialog } from '@/components/nutrition/create-client-meal-plan-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toDateKey } from '@/lib/calendar'
import {
  formatMealMacros,
  getTodayMealPlanDay,
  MEAL_TYPE_LABELS,
} from '@/lib/nutrition'
import {
  computeMealPlanSummary,
  formatMealPlanSummary,
} from '@/lib/meal-plan-stats'
import {
  mealPlanAssignmentFormSchema,
  type MealPlanAssignmentFormValues,
} from '@/lib/validations/nutrition'
import type {
  MealPlan,
  MealPlanAssignmentWithPlan,
  MealPlanDayWithMeals,
} from 'app/types/database'

type AssignMealPlanDialogProps = {
  clientId: string
  mealPlans: Pick<MealPlan, 'id' | 'name' | 'status'>[]
  trigger?: React.ReactNode
}

export function AssignMealPlanDialog({
  clientId,
  mealPlans,
  trigger,
}: AssignMealPlanDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)

  const assignablePlans = mealPlans.filter(
    (plan) => plan.status !== 'archived'
  )

  const form = useForm<MealPlanAssignmentFormValues>({
    resolver: zodResolver(mealPlanAssignmentFormSchema),
    defaultValues: {
      mealPlanId: '',
      startDate: toDateKey(new Date()),
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({
      mealPlanId: '',
      startDate: toDateKey(new Date()),
    })
  }, [open, form])

  async function onSubmit(values: MealPlanAssignmentFormValues) {
    setPending(true)
    const result = await assignMealPlanToClient(clientId, values)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Meal plan assigned.')
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <UserPlus className="size-4" />
            Assign meal plan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign meal plan</DialogTitle>
          <DialogDescription>
            Choose a reusable library template and start date for this client.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="mealPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal plan</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a meal plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assignablePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name}
                          {plan.status === 'draft' ? ' (draft)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={pending || assignablePlans.length === 0}>
                {pending ? 'Assigning…' : 'Assign plan'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

type ClientMealPlanAssignmentCardProps = {
  clientId: string
  clientName: string
  assignment: MealPlanAssignmentWithPlan | null
  mealPlans: Pick<MealPlan, 'id' | 'name' | 'status'>[]
  planDays?: MealPlanDayWithMeals[]
}

export function ClientMealPlanAssignmentCard({
  clientId,
  clientName,
  assignment,
  mealPlans,
  planDays = [],
}: ClientMealPlanAssignmentCardProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const summary = computeMealPlanSummary(planDays)
  const todayKey = toDateKey(new Date())
  const { day: todayDay, planDayLabel } = assignment
    ? getTodayMealPlanDay(assignment, planDays, todayKey)
    : { day: null, planDayLabel: null }

  async function handleCancel() {
    setPending(true)
    const result = await cancelMealPlanAssignment(clientId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Meal plan assignment cancelled.')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Meal plan</CardTitle>
          <CardDescription>
            Assign a library template or create a plan tailored to this client.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateClientMealPlanDialog
            clientId={clientId}
            clientName={clientName}
          />
          <AssignMealPlanDialog clientId={clientId} mealPlans={mealPlans} />
        </div>
      </CardHeader>
      <CardContent>
        {assignment ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="grid gap-1">
                <p className="font-medium">{assignment.meal_plan.name}</p>
                <p className="text-muted-foreground text-sm">
                  {summary.dayCount > 0
                    ? `${summary.dayCount}-day plan`
                    : 'Plan'}{' '}
                  · Started{' '}
                  {new Date(
                    `${assignment.start_date}T12:00:00`
                  ).toLocaleDateString()}
                </p>
                {formatMealPlanSummary(summary) ? (
                  <p className="text-muted-foreground text-sm">
                    {formatMealPlanSummary(summary)}
                  </p>
                ) : null}
                <Link
                  href={`/library/meal-plans/${assignment.meal_plan_id}`}
                  className="text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  Quick view
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={handleCancel}
              >
                {pending ? 'Cancelling…' : 'Cancel assignment'}
              </Button>
            </div>

            {todayDay && todayDay.meals.length > 0 ? (
              <div className="border-border bg-muted/20 rounded-lg border p-4">
                <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                  Today&apos;s meals ({planDayLabel})
                </p>
                <ul className="grid gap-2">
                  {todayDay.meals.map((meal) => {
                    const macros = formatMealMacros(meal)
                    return (
                      <li key={meal.id} className="text-sm">
                        <span className="text-muted-foreground">
                          {MEAL_TYPE_LABELS[meal.meal_type]}:
                        </span>{' '}
                        <span className="font-medium">{meal.name}</span>
                        {macros ? (
                          <span className="text-muted-foreground">
                            {' '}
                            · {macros}
                          </span>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No active meal plan assigned. Create a custom plan or assign a
            library template.
          </p>
        )}
      </CardContent>
    </Card>
  )
}