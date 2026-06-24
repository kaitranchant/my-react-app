import Link from 'next/link'
import { Suspense } from 'react'
import { Dumbbell } from 'lucide-react'

import { FilterPillsSkeleton } from '@/components/dashboard/async-fallback-skeletons'
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
import { AddExerciseButton } from '@/components/exercises/exercise-form-dialog'
import { ExerciseCatalogBrowser } from '@/components/exercises/exercise-catalog-browser'
import { ExerciseRowActions } from '@/components/exercises/exercise-row-actions'
import { ExerciseSourceBadge } from '@/components/exercises/exercise-source-badge'
import { ExerciseStatusBadge } from '@/components/exercises/exercise-status-badge'
import { ExerciseViewTabs } from '@/components/exercises/exercise-view-tabs'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import { exerciseStatuses } from '@/lib/validations/exercise'
import type { Exercise, ExerciseStatus } from 'app/types/database'

export const metadata = {
  title: 'Exercises — Library — Coaching App',
}

function isStatus(value: string): value is ExerciseStatus {
  return (exerciseStatuses as readonly string[]).includes(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function LibraryExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; view?: string; q?: string }>
}) {
  const { status, view, q } = await searchParams
  const showCatalog = view === 'catalog'
  const supabase = await createClient()

  let queryBuilder = supabase
    .from('exercises')
    .select('*')
    .order('updated_at', { ascending: false })

  if (status && isStatus(status)) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  if (q && q.trim()) {
    queryBuilder = queryBuilder.ilike('name', `%${q.trim()}%`)
  }

  const { data, error } = await queryBuilder
  const exercises = (data ?? []) as Exercise[]

  const importedIds = exercises
    .map((exercise) => exercise.external_id)
    .filter((id): id is string => Boolean(id))

  const statusFilters: { label: string; value?: ExerciseStatus }[] = [
    { label: 'All' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ]

  function statusHref(value?: ExerciseStatus) {
    const params = new URLSearchParams()
    if (view === 'catalog') params.set('view', 'catalog')
    if (value) params.set('status', value)
    const query = params.toString()
    return query ? `/library/exercises?${query}` : '/library/exercises'
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Individual movements — build your library manually or import from
          ExerciseDB.
        </p>
        {!showCatalog && <AddExerciseButton />}
      </div>

      <Suspense fallback={<FilterPillsSkeleton count={2} />}>
        <ExerciseViewTabs />
      </Suspense>

      {showCatalog ? (
        <Suspense
          fallback={
            <Card>
              <CardContent className="text-muted-foreground py-16 text-center text-sm">
                Loading catalog…
              </CardContent>
            </Card>
          }
        >
          <ExerciseCatalogBrowser importedIds={importedIds} />
        </Suspense>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const active = filter.value ? status === filter.value : !status
              return (
                <Link
                  key={filter.label}
                  href={statusHref(filter.value)}
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
                {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {error ? (
                <LibraryLoadError resource="exercises" error={error} />
              ) : exercises.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
                  <div className="empty-state-icon">
                    <Dumbbell className="size-7" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">No exercises yet</p>
                    <p className="text-muted-foreground max-w-sm text-sm">
                      {status || q
                        ? 'No exercises match this filter.'
                        : 'Add exercises manually or browse the ExerciseDB catalog.'}
                    </p>
                  </div>
                  {!status && (
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      <AddExerciseButton />
                      <Link
                        href="/library/exercises?view=catalog"
                        className="border hover:bg-accent inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors"
                      >
                        Browse catalog
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-4 md:hidden">
                    {exercises.map((exercise) => (
                      <Card key={exercise.id} className="py-0">
                        <CardContent className="space-y-2 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{exercise.name}</p>
                                <ExerciseSourceBadge source={exercise.source} />
                              </div>
                              {exercise.instructions ? (
                                <p className="text-muted-foreground text-xs">
                                  {exercise.instructions}
                                </p>
                              ) : null}
                            </div>
                            <ExerciseRowActions exercise={exercise} />
                          </div>
                          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            <span>{exercise.muscle_group ?? '—'}</span>
                            <span>{exercise.equipment ?? '—'}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <ExerciseStatusBadge status={exercise.status} />
                            <span className="text-muted-foreground text-xs">
                              Updated {formatDate(exercise.updated_at)}
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
                      <TableHead>Muscle group</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-12 pr-5" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exercises.map((exercise) => (
                      <TableRow key={exercise.id} className="group">
                        <TableCell className="pl-5">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{exercise.name}</p>
                              <ExerciseSourceBadge source={exercise.source} />
                            </div>
                            {exercise.instructions && (
                              <p className="text-muted-foreground max-w-md truncate text-xs">
                                {exercise.instructions}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {exercise.muscle_group ?? '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {exercise.equipment ?? '—'}
                        </TableCell>
                        <TableCell>
                          <ExerciseStatusBadge status={exercise.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(exercise.updated_at)}
                        </TableCell>
                        <TableCell className="pr-5">
                          <ExerciseRowActions exercise={exercise} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
