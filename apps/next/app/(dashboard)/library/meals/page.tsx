import Link from 'next/link'
import { Suspense } from 'react'
import { Search, UtensilsCrossed } from 'lucide-react'

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
import { AddMealLibraryButton } from '@/components/meal-library/meal-library-form-dialog'
import { MealLibraryCalorieFilter } from '@/components/meal-library/meal-library-calorie-filter'
import {
  MealLibraryCarbsFilter,
  MealLibraryFatFilter,
  MealLibraryProteinFilter,
} from '@/components/meal-library/meal-library-macro-filters'
import { MealLibraryRowActions } from '@/components/meal-library/meal-library-row-actions'
import { MealLibraryStatusBadge } from '@/components/meal-library/meal-library-status-badge'
import { MealLibraryTypeFilter } from '@/components/meal-library/meal-library-type-filter'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import {
  buildMealLibraryHref,
  parseMealLibraryCalorieRange,
  parseMealLibraryCarbsRange,
  parseMealLibraryFatRange,
  parseMealLibraryProteinRange,
} from '@/lib/meal-library-filters'
import { fetchLibraryMealsList } from '@/lib/meal-library-data.server'
import { formatFoodMacrosShort } from '@/lib/food-catalog'
import { MEAL_TYPE_LABELS } from '@/lib/nutrition'
import { mealTypes } from '@/lib/validations/nutrition'
import type { ExerciseStatus, LibraryMeal, MealType } from 'app/types/database'

export const metadata = {
  title: 'Meals — Library — Coaching App',
}

function isStatus(value: string): value is ExerciseStatus {
  return value === 'active' || value === 'archived'
}

function isMealType(value: string): value is MealType {
  return (mealTypes as readonly string[]).includes(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCalories(value: number | null) {
  if (value == null) return '—'
  return `${Math.round(value)} kcal`
}

function formatProtein(value: number | null) {
  if (value == null) return '—'
  return `${value}g`
}

export default async function LibraryMealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    type?: string
    calories?: string
    protein?: string
    carbs?: string
    fat?: string
    q?: string
  }>
}) {
  const { status, type, calories, protein, carbs, fat, q } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  let meals: LibraryMeal[] = []
  let loadError: { message: string } | null = null

  try {
    meals = await fetchLibraryMealsList(supabase, user.id, {
      status: status && isStatus(status) ? status : undefined,
      mealType: type && isMealType(type) ? type : undefined,
      calorieRange: parseMealLibraryCalorieRange(calories) ?? undefined,
      proteinRange: parseMealLibraryProteinRange(protein) ?? undefined,
      carbsRange: parseMealLibraryCarbsRange(carbs) ?? undefined,
      fatRange: parseMealLibraryFatRange(fat) ?? undefined,
      q,
    })
  } catch (error) {
    loadError = {
      message:
        error instanceof Error ? error.message : 'Could not load meal library.',
    }
  }

  const statusFilters: { label: string; value?: ExerciseStatus }[] = [
    { label: 'All' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ]

  function buildFilterHref(filterStatus?: ExerciseStatus) {
    return buildMealLibraryHref({
      status: filterStatus,
      mealType: type && isMealType(type) ? type : undefined,
      calorieRange: parseMealLibraryCalorieRange(calories) ?? undefined,
      proteinRange: parseMealLibraryProteinRange(protein) ?? undefined,
      carbsRange: parseMealLibraryCarbsRange(carbs) ?? undefined,
      fatRange: parseMealLibraryFatRange(fat) ?? undefined,
      q,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Reusable meals filtered by type, calories, and macros — pick from here
          while building meal plans.
        </p>
        <AddMealLibraryButton />
      </div>

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => {
          const active = filter.value ? status === filter.value : !status
          return (
            <Link
              key={filter.label}
              href={buildFilterHref(filter.value)}
              className={
                active
                  ? 'bg-primary text-primary-foreground inline-flex h-8 items-center rounded-full px-3 text-sm font-medium'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 inline-flex h-8 items-center rounded-full px-3 text-sm font-medium'
              }
            >
              {filter.label}
            </Link>
          )
        })}
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-muted-foreground text-base">
            Search & filter
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <form action="/library/meals" method="get" className="relative">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            {type ? <input type="hidden" name="type" value={type} /> : null}
            {calories ? <input type="hidden" name="calories" value={calories} /> : null}
            {protein ? <input type="hidden" name="protein" value={protein} /> : null}
            {carbs ? <input type="hidden" name="carbs" value={carbs} /> : null}
            {fat ? <input type="hidden" name="fat" value={fat} /> : null}
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search meals…"
              className="pl-9"
            />
          </form>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
            <div className="min-w-0">
              <Suspense fallback={null}>
                <MealLibraryTypeFilter />
              </Suspense>
            </div>
            <div className="min-w-0">
              <Suspense fallback={null}>
                <MealLibraryCalorieFilter />
              </Suspense>
            </div>
            <div className="min-w-0">
              <Suspense fallback={null}>
                <MealLibraryProteinFilter />
              </Suspense>
            </div>
            <div className="min-w-0">
              <Suspense fallback={null}>
                <MealLibraryCarbsFilter />
              </Suspense>
            </div>
            <div className="min-w-0">
              <Suspense fallback={null}>
                <MealLibraryFatFilter />
              </Suspense>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadError ? (
        <LibraryLoadError
          resource="library meals"
          error={loadError}
          sqlFile="0099_library_meals.sql"
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b bg-muted/30 px-5 py-4">
            <CardTitle className="text-base">
              {meals.length} meal{meals.length === 1 ? '' : 's'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {meals.length === 0 ? (
              <div className="px-6 py-20">
                <EmptyState
                  icon={UtensilsCrossed}
                  title="No meals yet"
                  description="Add your first reusable meal to the library."
                />
              </div>
            ) : (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {meals.map((meal) => (
                    <Card key={meal.id} className="py-0">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <Link
                              href={`/library/meals/${meal.id}`}
                              className="font-medium hover:underline"
                            >
                              {meal.name}
                            </Link>
                            <p className="text-muted-foreground text-xs">
                              {MEAL_TYPE_LABELS[meal.meal_type]}
                            </p>
                          </div>
                          <MealLibraryRowActions meal={meal} />
                        </div>
                        {meal.calories_kcal != null ? (
                          <p className="text-muted-foreground text-xs">
                            {formatFoodMacrosShort({
                              caloriesKcal: meal.calories_kcal,
                              proteinG: meal.protein_g ?? 0,
                              carbsG: meal.carbs_g ?? 0,
                              fatG: meal.fat_g ?? 0,
                            })}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <MealLibraryStatusBadge status={meal.status} />
                          <span className="text-muted-foreground text-xs">
                            Updated {formatDate(meal.updated_at)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Table className="hidden md:table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Name</TableHead>
                    <TableHead>Meal type</TableHead>
                    <TableHead>Calories</TableHead>
                    <TableHead>Protein</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12 pr-5">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meals.map((meal) => (
                    <TableRow key={meal.id} className="group">
                      <TableCell className="pl-5 font-medium">
                        <Link
                          href={`/library/meals/${meal.id}`}
                          className="hover:underline"
                        >
                          {meal.name}
                        </Link>
                      </TableCell>
                      <TableCell>{MEAL_TYPE_LABELS[meal.meal_type]}</TableCell>
                      <TableCell>{formatCalories(meal.calories_kcal)}</TableCell>
                      <TableCell>{formatProtein(meal.protein_g)}</TableCell>
                      <TableCell>
                        <MealLibraryStatusBadge status={meal.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(meal.updated_at)}
                      </TableCell>
                      <TableCell className="pr-5">
                        <MealLibraryRowActions meal={meal} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
