import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { LibraryMealEditor } from '@/components/meal-library/library-meal-editor'
import { MealLibraryStatusBadge } from '@/components/meal-library/meal-library-status-badge'
import { Button } from '@/components/ui/button'
import { fetchLibraryMealWithFoods } from '@/lib/meal-library-data.server'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mealId: string }>
}) {
  const { mealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { title: 'Meal — Library — Coaching App' }
  }

  const meal = await fetchLibraryMealWithFoods(supabase, user.id, mealId)
  return {
    title: meal
      ? `${meal.name} — Meals — Library — Coaching App`
      : 'Meal — Library — Coaching App',
  }
}

export default async function LibraryMealDetailPage({
  params,
}: {
  params: Promise<{ mealId: string }>
}) {
  const { mealId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const meal = await fetchLibraryMealWithFoods(supabase, user.id, mealId)
  if (!meal) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
            <Link href="/library/meals">
              <ArrowLeft className="size-4" />
              Back to meals
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{meal.name}</h1>
            <MealLibraryStatusBadge status={meal.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {MEAL_TYPE_LABELS[meal.meal_type]}
            {meal.calories_kcal != null
              ? ` · ${Math.round(meal.calories_kcal)} kcal`
              : null}
          </p>
        </div>
      </div>

      <LibraryMealEditor meal={meal} />
    </div>
  )
}
