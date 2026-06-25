import Link from 'next/link'
import { UtensilsCrossed } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AddMealPlanButton } from '@/components/meal-plans/meal-plan-form-dialog'
import { MealPlanRowActions } from '@/components/meal-plans/meal-plan-row-actions'
import { MealPlanStatusBadge } from '@/components/meal-plans/meal-plan-status-badge'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import type { MealPlan, MealPlanStatus } from 'app/types/database'

export const metadata = {
  title: 'Meal plans — Library — Coaching App',
}

function isStatus(value: string): value is MealPlanStatus {
  return value === 'draft' || value === 'active' || value === 'archived'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function LibraryMealPlansPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('meal_plans')
    .select('*')
    .is('client_id', null)
    .order('updated_at', { ascending: false })

  if (status && isStatus(status)) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  const { data, error } = await queryBuilder
  const mealPlans = (data ?? []) as MealPlan[]

  const { data: assignmentRows } = await supabase
    .from('meal_plan_assignments')
    .select('meal_plan_id')
    .eq('status', 'active')

  const { data: dayRows } = await supabase
    .from('meal_plan_days')
    .select('meal_plan_id')

  const assignmentCounts = new Map<string, number>()
  for (const row of assignmentRows ?? []) {
    assignmentCounts.set(
      row.meal_plan_id,
      (assignmentCounts.get(row.meal_plan_id) ?? 0) + 1
    )
  }

  const dayCounts = new Map<string, number>()
  for (const row of dayRows ?? []) {
    dayCounts.set(
      row.meal_plan_id,
      (dayCounts.get(row.meal_plan_id) ?? 0) + 1
    )
  }

  const statusFilters: { label: string; value?: MealPlanStatus }[] = [
    { label: 'All' },
    { label: 'Active', value: 'active' },
    { label: 'Draft', value: 'draft' },
    { label: 'Archived', value: 'archived' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Reusable meal plan templates — build days and meals, then assign to
          clients.
        </p>
        <AddMealPlanButton />
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const active = filter.value ? status === filter.value : !status
          const href = filter.value
            ? `/library/meal-plans?status=${filter.value}`
            : '/library/meal-plans'
          return (
            <Link
              key={filter.label}
              href={href}
              className={
                active
                  ? 'filter-pill filter-pill-active'
                  : 'filter-pill filter-pill-inactive'
              }
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-muted-foreground">
            {mealPlans.length} meal plan{mealPlans.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <LibraryLoadError
              resource="meal plans"
              error={error}
              sqlFile="apply-nutrition.sql"
            />
          ) : mealPlans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="empty-state-icon">
                <UtensilsCrossed className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No meal plans yet</p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  {status
                    ? 'No meal plans match this filter.'
                    : 'Create your first meal plan template to assign to clients.'}
                </p>
              </div>
              {!status ? (
                <div className="pt-2">
                  <AddMealPlanButton />
                </div>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12 pr-5" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mealPlans.map((mealPlan) => (
                  <TableRow key={mealPlan.id} className="group">
                    <TableCell className="pl-5">
                      <div className="space-y-0.5">
                        <Link
                          href={`/library/meal-plans/${mealPlan.id}`}
                          className="font-medium hover:underline"
                        >
                          {mealPlan.name}
                        </Link>
                        {mealPlan.description ? (
                          <p className="text-muted-foreground max-w-md truncate text-xs">
                            {mealPlan.description}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <MealPlanStatusBadge status={mealPlan.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {dayCounts.get(mealPlan.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {assignmentCounts.get(mealPlan.id) ?? 0} client
                      {(assignmentCounts.get(mealPlan.id) ?? 0) === 1 ? '' : 's'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(mealPlan.updated_at)}
                    </TableCell>
                    <TableCell className="pr-5">
                      <MealPlanRowActions mealPlan={mealPlan} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
