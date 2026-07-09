import Link from 'next/link'
import { Suspense } from 'react'
import { Dumbbell, Search } from 'lucide-react'

import { FilterPillsSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { createClient } from '@/lib/supabase/server'
import { ensureCoachCatalogSeeded } from '@/lib/coach-exercise-library.server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AddExerciseButton } from '@/components/exercises/exercise-form-dialog'
import { ExerciseLibraryMuscleFilter } from '@/components/exercises/exercise-library-muscle-filter'
import { ExerciseLibraryTable } from '@/components/exercises/exercise-library-table'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import { EXERCISE_LIBRARY_PAGE_SIZE } from '@/lib/constants'
import { getExerciseMuscleFilterOptions } from '@/lib/exercise-catalog.server'
import { buildExerciseLibraryHref } from '@/lib/exercise-library-url'
import {
  exerciseStatuses,
  parseExerciseLibraryMuscleFilter,
  parseExerciseLibrarySort,
  parseExerciseLibrarySortDirection,
} from '@/lib/validations/exercise'
import type { Exercise, ExerciseStatus } from 'app/types/database'

export const metadata = {
  title: 'Exercises — Library — Coaching App',
}

const LIST_COLUMNS =
  'id, coach_id, name, muscle_group, equipment, status, source, external_id, image_url, demo_video_path, demo_video_url, category, difficulty, created_at, updated_at'

function isStatus(value: string): value is ExerciseStatus {
  return (exerciseStatuses as readonly string[]).includes(value)
}

function buildHref(params: {
  status?: ExerciseStatus
  q?: string
  muscle?: string
  page?: number
  sort?: ReturnType<typeof parseExerciseLibrarySort>
  dir?: ReturnType<typeof parseExerciseLibrarySortDirection>
}) {
  return buildExerciseLibraryHref({
    status: params.status,
    q: params.q,
    muscle: params.muscle,
    page: params.page,
    sort: params.sort ?? 'name',
    dir: params.dir ?? 'asc',
  })
}

export default async function LibraryExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    q?: string
    page?: string
    sort?: string
    dir?: string
    muscle?: string
  }>
}) {
  const {
    status,
    q,
    page: pageParam,
    sort: sortParam,
    dir: dirParam,
    muscle: muscleParam,
  } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const sort = parseExerciseLibrarySort(sortParam)
  const dir = parseExerciseLibrarySortDirection(dirParam)
  const muscleOptions = getExerciseMuscleFilterOptions()
  const muscle = parseExerciseLibraryMuscleFilter(muscleParam, muscleOptions)
  const listState = {
    status: status && isStatus(status) ? status : undefined,
    q,
    muscle,
    sort,
    dir,
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await ensureCoachCatalogSeeded(supabase, user.id)
  }

  let queryBuilder = supabase
    .from('exercises')
    .select(LIST_COLUMNS, { count: 'exact' })
    .order('name', { ascending: dir === 'asc', nullsFirst: false })

  if (status && isStatus(status)) {
    queryBuilder = queryBuilder.eq('status', status)
  }

  if (q && q.trim()) {
    queryBuilder = queryBuilder.ilike('name', `%${q.trim()}%`)
  }

  if (muscle) {
    queryBuilder = queryBuilder.ilike('muscle_group', `%${muscle}%`)
  }

  const from = (page - 1) * EXERCISE_LIBRARY_PAGE_SIZE
  const to = from + EXERCISE_LIBRARY_PAGE_SIZE - 1

  const { data, error, count } = await queryBuilder.range(from, to)
  const exercises = (data ?? []) as Exercise[]
  const totalCount = count ?? exercises.length
  const totalPages = Math.max(1, Math.ceil(totalCount / EXERCISE_LIBRARY_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const statusFilters: { label: string; value?: ExerciseStatus }[] = [
    { label: 'All' },
    { label: 'Active', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Your exercise library includes the full catalog plus any custom
          movements you add.
        </p>
        <AddExerciseButton />
      </div>

      <Suspense fallback={<FilterPillsSkeleton count={3} />}>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const active = filter.value ? status === filter.value : !status
            return (
              <Link
                key={filter.label}
                href={buildHref({ ...listState, status: filter.value, page: 1 })}
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
      </Suspense>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-muted-foreground">
            Search exercises
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <form
              action="/library/exercises"
              method="get"
              className="relative min-w-0 flex-1"
            >
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search by name, e.g. squat, bench press…"
                className="pl-9"
              />
              {status && isStatus(status) ? (
                <input type="hidden" name="status" value={status} />
              ) : null}
              {muscle ? <input type="hidden" name="muscle" value={muscle} /> : null}
              {dir !== 'asc' ? (
                <input type="hidden" name="dir" value={dir} />
              ) : null}
            </form>
            <Suspense fallback={null}>
              <ExerciseLibraryMuscleFilter options={muscleOptions} />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-muted-foreground">
            {totalCount} exercise{totalCount === 1 ? '' : 's'}
            {totalCount > EXERCISE_LIBRARY_PAGE_SIZE
              ? ` · page ${currentPage} of ${totalPages}`
              : ''}
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
                <p className="font-medium">No exercises found</p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  {status || q || muscle
                    ? 'No exercises match this filter.'
                    : 'Add a custom exercise to extend your library.'}
                </p>
              </div>
              {!status && !q && !muscle && <AddExerciseButton />}
            </div>
          ) : (
            <>
              <ExerciseLibraryTable exercises={exercises} listState={listState} />
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-5 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    asChild={currentPage > 1}
                  >
                    {currentPage > 1 ? (
                      <Link
                        href={buildHref({
                          ...listState,
                          page: currentPage - 1,
                        })}
                      >
                        Previous
                      </Link>
                    ) : (
                      <span>Previous</span>
                    )}
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    {from + 1}–{from + exercises.length} of {totalCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    asChild={currentPage < totalPages}
                  >
                    {currentPage < totalPages ? (
                      <Link
                        href={buildHref({
                          ...listState,
                          page: currentPage + 1,
                        })}
                      >
                        Next
                      </Link>
                    ) : (
                      <span>Next</span>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
