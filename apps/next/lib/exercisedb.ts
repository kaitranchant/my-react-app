import {
  EXERCISEDB_API_PAGE_SIZE,
  EXERCISEDB_CATALOG_PAGE_SIZE,
} from '@/lib/constants'

export const EXERCISEDB_HOST = 'exercisedb.p.rapidapi.com'
export const EXERCISEDB_BASE_URL = `https://${EXERCISEDB_HOST}`

export type ExerciseDbExercise = {
  id: string
  name: string
  bodyPart: string
  target: string
  equipment: string
  secondaryMuscles?: string[]
  instructions?: string[]
  description?: string
  difficulty?: string
  category?: string
  gifUrl?: string
}

export class ExerciseDbError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'ExerciseDbError'
  }
}

function getApiKey() {
  const key = process.env.EXERCISEDB_RAPIDAPI_KEY?.trim()
  if (!key) {
    throw new ExerciseDbError(
      'ExerciseDB is not configured. Add EXERCISEDB_RAPIDAPI_KEY to apps/next/.env.local.'
    )
  }
  return key
}

function buildUrl(path: string, params?: Record<string, string | number>) {
  const url = new URL(path, EXERCISEDB_BASE_URL)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function exerciseDbFetch<T>(
  path: string,
  params?: Record<string, string | number>,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    ...init,
    headers: {
      'X-RapidAPI-Key': getApiKey(),
      'X-RapidAPI-Host': EXERCISEDB_HOST,
      ...init?.headers,
    },
    cache: init?.cache ?? 'no-store',
  })

  if (!response.ok) {
    const body = await response.text()
    throw new ExerciseDbError(
      body || `ExerciseDB request failed (${response.status})`,
      response.status
    )
  }

  return response.json() as Promise<T>
}

export function isExerciseDbConfigured() {
  return Boolean(process.env.EXERCISEDB_RAPIDAPI_KEY?.trim())
}

export async function fetchExerciseDbLists() {
  const [bodyParts, equipment, targets] = await Promise.all([
    exerciseDbFetch<string[]>('/exercises/bodyPartList', undefined, {
      cache: 'force-cache',
      next: { revalidate: 86_400 },
    }),
    exerciseDbFetch<string[]>('/exercises/equipmentList', undefined, {
      cache: 'force-cache',
      next: { revalidate: 86_400 },
    }),
    exerciseDbFetch<string[]>('/exercises/targetList', undefined, {
      cache: 'force-cache',
      next: { revalidate: 86_400 },
    }),
  ])

  return { bodyParts, equipment, targets }
}

export async function fetchExerciseDbById(id: string) {
  return exerciseDbFetch<ExerciseDbExercise>(`/exercises/exercise/${encodeURIComponent(id)}`)
}

type ExerciseDbListParams = {
  offset: number
  limit: number
  sortMethod: string
  sortOrder: string
}

async function fetchExerciseDbList(
  path: string,
  params: ExerciseDbListParams
) {
  return exerciseDbFetch<ExerciseDbExercise[]>(path, params)
}

/** RapidAPI free tier caps each request at 10 — batch requests to fill a catalog page. */
async function fetchExerciseDbPage(
  path: string,
  startOffset: number,
  pageSize = EXERCISEDB_CATALOG_PAGE_SIZE
) {
  const sort = { sortMethod: 'name', sortOrder: 'ascending' }
  const exercises: ExerciseDbExercise[] = []
  let apiOffset = startOffset

  while (exercises.length < pageSize) {
    const chunk = await fetchExerciseDbList(path, {
      offset: apiOffset,
      limit: EXERCISEDB_API_PAGE_SIZE,
      ...sort,
    })

    exercises.push(...chunk)

    if (chunk.length < EXERCISEDB_API_PAGE_SIZE) {
      return { exercises, hasMore: false }
    }

    apiOffset += chunk.length
  }

  return { exercises, hasMore: true }
}

export type SearchExerciseDbParams = {
  query?: string
  bodyPart?: string
  equipment?: string
  target?: string
  offset?: number
  limit?: number
}

export async function searchExerciseDb({
  query,
  bodyPart,
  equipment,
  target,
  offset = 0,
  limit = EXERCISEDB_CATALOG_PAGE_SIZE,
}: SearchExerciseDbParams) {
  const pageSize = Math.min(Math.max(limit, 1), EXERCISEDB_CATALOG_PAGE_SIZE)

  let path: string
  if (query?.trim()) {
    path = `/exercises/name/${encodeURIComponent(query.trim())}`
  } else if (bodyPart) {
    path = `/exercises/bodyPart/${encodeURIComponent(bodyPart)}`
  } else if (equipment) {
    path = `/exercises/equipment/${encodeURIComponent(equipment)}`
  } else if (target) {
    path = `/exercises/target/${encodeURIComponent(target)}`
  } else {
    path = '/exercises'
  }

  const { exercises: results, hasMore } = await fetchExerciseDbPage(
    path,
    offset,
    pageSize
  )

  const normalizedQuery = query?.trim().toLowerCase()
  const filtered = results.filter((exercise) => {
    if (bodyPart && exercise.bodyPart !== bodyPart) return false
    if (equipment && exercise.equipment !== equipment) return false
    if (target && exercise.target !== target) return false
    if (normalizedQuery && !exercise.name.toLowerCase().includes(normalizedQuery)) {
      return false
    }
    return true
  })

  return {
    exercises: filtered,
    offset,
    limit: pageSize,
    hasMore,
  }
}

export function exerciseDbImageUrl(exerciseId: string, resolution = '180') {
  const params = new URLSearchParams({
    exerciseId,
    resolution,
  })
  return `/api/exercisedb/image?${params.toString()}`
}

export function mapExerciseDbToRow(exercise: ExerciseDbExercise) {
  const instructions = [
    exercise.description?.trim(),
    ...(exercise.instructions ?? []).map((step, index) => `${index + 1}. ${step}`),
  ]
    .filter(Boolean)
    .join('\n\n')

  const muscleGroup = [exercise.target, exercise.bodyPart]
    .filter(Boolean)
    .join(' · ')

  return {
    name: exercise.name,
    instructions: instructions || null,
    muscle_group: muscleGroup || null,
    equipment: exercise.equipment || null,
    status: 'active' as const,
    source: 'exercisedb' as const,
    external_id: exercise.id,
    image_url: exerciseDbImageUrl(exercise.id),
    difficulty: exercise.difficulty ?? null,
    category: exercise.category ?? null,
  }
}
