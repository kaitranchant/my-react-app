import type { ExerciseStatus } from 'app/types/database'

import type {
  ExerciseLibrarySort,
  ExerciseLibrarySortDirection,
} from '@/lib/validations/exercise'

export type ExerciseLibraryListState = {
  status?: ExerciseStatus
  q?: string
  muscle?: string
  sort: ExerciseLibrarySort
  dir: ExerciseLibrarySortDirection
}

export function buildExerciseLibraryHref({
  status,
  q,
  muscle,
  page = 1,
  sort = 'name',
  dir = 'asc',
}: ExerciseLibraryListState & { page?: number }) {
  const search = new URLSearchParams()
  if (status) search.set('status', status)
  if (q?.trim()) search.set('q', q.trim())
  if (muscle) search.set('muscle', muscle)
  if (page > 1) search.set('page', String(page))
  if (dir !== 'asc') search.set('dir', dir)
  const query = search.toString()
  return query ? `/library/exercises?${query}` : '/library/exercises'
}

export function getExerciseLibrarySortHref(
  state: ExerciseLibraryListState,
  column: ExerciseLibrarySort
) {
  const nextDir: ExerciseLibrarySortDirection =
    state.sort === column ? (state.dir === 'asc' ? 'desc' : 'asc') : 'asc'

  return buildExerciseLibraryHref({
    ...state,
    sort: column,
    dir: nextDir,
    page: 1,
  })
}
