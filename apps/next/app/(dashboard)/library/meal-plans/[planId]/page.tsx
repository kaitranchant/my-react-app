import { notFound } from 'next/navigation'

import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { fetchMealPlanDaysWithMeals } from '@/lib/meal-plan-data.server'
import { MealPlanDayEditor } from '@/components/meal-plans/meal-plan-day-editor'
import { MealPlanFormDialog } from '@/components/meal-plans/meal-plan-form-dialog'
import { MealPlanStatusBadge } from '@/components/meal-plans/meal-plan-status-badge'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
import type { MealPlan } from 'app/types/database'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ planId: string }>
}) {
  const { planId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('meal_plans')
    .select('name')
    .eq('id', planId)
    .maybeSingle()

  return {
    title: data?.name
      ? `${data.name} — Meal plans — Library — Coaching App`
      : 'Meal plan — Library — Coaching App',
  }
}

export default async function MealPlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>
  searchParams: Promise<{ clientId?: string }>
}) {
  const { planId } = await params
  const { clientId: returnClientId } = await searchParams
  const supabase = await createClient()

  const { data: mealPlanData, error: mealPlanError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle()

  if (mealPlanError?.message.includes('Could not find the table')) {
    return (
      <LibraryLoadError
        resource="meal plans"
        error={mealPlanError}
        sqlFile="apply-nutrition.sql"
      />
    )
  }

  if (!mealPlanData) {
    notFound()
  }

  const mealPlan = mealPlanData as MealPlan

  let clientName: string | null = null
  if (mealPlan.client_id) {
    const { data: clientData } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', mealPlan.client_id)
      .maybeSingle()
    clientName = clientData?.full_name ?? null
  }

  const days = await fetchMealPlanDaysWithMeals(supabase, planId)

  return (
    <div className="flex flex-col gap-6">
      {returnClientId || mealPlan.client_id ? (
        <Link
          href={`/clients/${returnClientId ?? mealPlan.client_id}?tab=nutrition`}
          className="text-muted-foreground hover:text-foreground text-sm font-medium"
        >
          ← Back to {clientName ? `${clientName}'s nutrition` : 'client nutrition'}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title">{mealPlan.name}</h1>
            <MealPlanStatusBadge status={mealPlan.status} />
            {mealPlan.client_id ? (
              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
                Client plan
              </span>
            ) : null}
          </div>
          {mealPlan.client_id && clientName ? (
            <p className="text-muted-foreground text-sm">
              Custom plan for {clientName}
            </p>
          ) : null}
          {mealPlan.description ? (
            <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
              {mealPlan.description}
            </p>
          ) : null}
        </div>
        <MealPlanFormDialog
          mealPlan={mealPlan}
          trigger={<Button variant="outline">Edit details</Button>}
        />
      </div>

      <MealPlanDayEditor mealPlanId={mealPlan.id} days={days} />
    </div>
  )
}
