'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Copy, UserPlus, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import {
  assignMealPlanToClient,
  cancelMealPlanAssignment,
  extendMealPlanAssignment,
} from '@/app/(dashboard)/clients/[clientId]/nutrition/actions'
import { MealPlanStatusBadge } from '@/components/meal-plans/meal-plan-status-badge'
import { CreateClientMealPlanDialog } from '@/components/nutrition/create-client-meal-plan-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
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
  assessMealPlanTargetAlignment,
  formatMealPlanTargetWarning,
} from '@/lib/meal-plan-target-alignment'
import { getTodayMealPlanDay } from '@/lib/nutrition'
import {
  computeMealPlanSummary,
} from '@/lib/meal-plan-stats'
import {
  mealPlanAssignmentFormSchema,
  type MealPlanAssignmentFormValues,
} from '@/lib/validations/nutrition'
import type {
  ClientNutritionProfile,
  MealPlan,
  MealPlanAssignmentWithPlan,
  MealPlanDayWithMeals,
} from 'app/types/database'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

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

  const assignablePlans = mealPlans.filter((plan) => plan.status === 'active')

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
        {assignablePlans.length === 0 ? (
          <div className="text-muted-foreground grid gap-3 text-sm leading-relaxed">
            <p>
              No library meal plan templates yet. Create one in the{' '}
              <Link
                href="/library/meal-plans"
                className="text-foreground font-medium underline underline-offset-2"
              >
                meal plans library
              </Link>{' '}
              first, or use &ldquo;Create custom plan&rdquo; on the client
              nutrition tab.
            </p>
          </div>
        ) : (
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
                <Button type="submit" disabled={pending}>
                  {pending ? 'Assigning…' : 'Assign plan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}

type ClientMealPlanAssignmentCardProps = {
  clientId: string
  clientName: string
  assignment: MealPlanAssignmentWithPlan | null
  mealPlans: Pick<MealPlan, 'id' | 'name' | 'status'>[]
  clientMealPlans?: Pick<MealPlan, 'id' | 'name' | 'status' | 'updated_at'>[]
  planDays?: MealPlanDayWithMeals[]
  profile?: ClientNutritionProfile | null
}

function formatPlanUpdated(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ClientMealPlanAssignmentCard({
  clientId,
  clientName,
  assignment,
  mealPlans,
  clientMealPlans = [],
  planDays = [],
  profile = null,
}: ClientMealPlanAssignmentCardProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [activatingPlanId, setActivatingPlanId] = React.useState<string | null>(
    null
  )

  async function handleExtendPlan() {
    setPending(true)
    const result = await extendMealPlanAssignment(clientId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Meal plan extended with another cycle.')
    router.refresh()
  }

  const removeConfirm = useConfirmDialog({
    title: 'Remove meal plan assignment?',
    description:
      'This client will no longer see meals from this plan on their portal. The plan itself is not deleted.',
    confirmLabel: 'Remove assignment',
    destructive: true,
    onConfirm: async () => {
      setPending(true)
      const result = await cancelMealPlanAssignment(clientId)
      setPending(false)

      if (!result.success) {
        toast.error(result.error)
        throw new Error(result.error)
      }

      toast.success('Meal plan assignment cancelled.')
      router.refresh()
    },
  })

  const summary = computeMealPlanSummary(planDays)
  const targetAlignment = assessMealPlanTargetAlignment(
    summary,
    profile?.calories_kcal
  )
  const todayKey = toDateKey(new Date())
  const planComplete = assignment
    ? getTodayMealPlanDay(assignment, planDays, todayKey).planComplete
    : false

  const otherClientPlans = clientMealPlans.filter(
    (plan) => plan.id !== assignment?.meal_plan_id
  )
  const isClientSpecificAssignment = Boolean(
    assignment &&
      clientMealPlans.some((plan) => plan.id === assignment.meal_plan_id)
  )
  const planEditorHref = assignment
    ? `/library/meal-plans/${assignment.meal_plan_id}?clientId=${clientId}`
    : null

  async function handleActivateClientPlan(planId: string) {
    setActivatingPlanId(planId)
    const result = await assignMealPlanToClient(clientId, {
      mealPlanId: planId,
      startDate: todayKey,
    })
    setActivatingPlanId(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Meal plan assigned.')
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
        {assignment && !assignment.meal_plan ? (
          <div className="grid gap-3">
            <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>
                This client is linked to a meal plan that no longer exists. Remove
                the assignment and choose a different plan.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive w-fit"
              disabled={pending}
              onClick={() => removeConfirm.open()}
            >
              {pending ? 'Removing…' : 'Remove broken assignment'}
            </Button>
          </div>
        ) : assignment?.meal_plan ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <p className="font-medium">{assignment.meal_plan.name}</p>
              <p className="text-muted-foreground text-sm">
                {summary.dayCount > 0
                  ? `${summary.dayCount}-day`
                  : 'Plan'}{' '}
                · Started{' '}
                {new Date(`${assignment.start_date}T12:00:00`).toLocaleDateString(
                  undefined,
                  { month: 'short', day: 'numeric', year: 'numeric' }
                )}
              </p>
              {summary.avgDailyMacros ? (
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="tabular-nums">
                    {summary.avgDailyMacros.caloriesKcal.toLocaleString()} kcal
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {summary.avgDailyMacros.proteinG}g P
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {summary.avgDailyMacros.carbsG}g C
                  </Badge>
                  <Badge variant="secondary" className="tabular-nums">
                    {summary.avgDailyMacros.fatG}g F
                  </Badge>
                </div>
              ) : null}
              {targetAlignment?.isMisaligned ? (
                <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>{formatMealPlanTargetWarning(targetAlignment)}</p>
                </div>
              ) : null}
              {planComplete ? (
                <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      This client has reached the end of the plan. Extend the
                      current cycle or assign a different plan.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-amber-500/40 bg-background"
                    disabled={pending || summary.dayCount === 0}
                    onClick={handleExtendPlan}
                  >
                    <Copy className="size-4" />
                    {pending ? 'Extending…' : 'Extend plan'}
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                size="sm"
                className="w-full"
                asChild
              >
                <Link href={planEditorHref!}>
                  {isClientSpecificAssignment ? 'Edit plan' : 'Quick view'}
                </Link>
              </Button>
              <AssignMealPlanDialog
                clientId={clientId}
                mealPlans={mealPlans}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    Change plan
                  </Button>
                }
              />
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive w-full"
                disabled={pending}
                onClick={() => removeConfirm.open()}
              >
                {pending ? 'Removing…' : 'Remove'}
              </Button>
            </div>
          </div>
        ) : otherClientPlans.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="No meal plan assigned"
            description="Create a custom plan for this client or assign a library template."
            className="py-4"
          />
        ) : null}

        {otherClientPlans.length > 0 ? (
          <div
            className={
              assignment ? 'border-border mt-4 border-t pt-4' : 'grid gap-3'
            }
          >
            {assignment ? (
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Other client plans
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Custom plans for this client. Activate one or create a new plan.
              </p>
            )}
            <ul className="divide-border divide-y">
              {otherClientPlans.map((plan) => {
                const isActivating = activatingPlanId === plan.id
                const canActivate =
                  plan.status === 'active' || plan.status === 'draft'

                return (
                  <li
                    key={plan.id}
                    className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{plan.name}</p>
                        <MealPlanStatusBadge status={plan.status} />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Updated {formatPlanUpdated(plan.updated_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/library/meal-plans/${plan.id}?clientId=${clientId}`}
                        >
                          <UtensilsCrossed className="size-4" />
                          Edit plan
                        </Link>
                      </Button>
                      {canActivate ? (
                        <Button
                          size="sm"
                          disabled={pending || isActivating}
                          onClick={() => handleActivateClientPlan(plan.id)}
                        >
                          {isActivating ? 'Assigning…' : 'Activate'}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </CardContent>
      {removeConfirm.dialog}
    </Card>
  )
}