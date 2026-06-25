import 'server-only'

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { EXERCISEDB_CATALOG_PAGE_SIZE } from '@/lib/constants'
import {
  exerciseDbImageUrl,
  type ExerciseDbExercise,
  type FreeExerciseRecord,
} from '@/lib/exercise-catalog'

export type { ExerciseDbExercise, FreeExerciseRecord } from '@/lib/exercise-catalog'
export { exerciseDbImageUrl } from '@/lib/exercise-catalog'

export class ExerciseDbError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message)
    this.name = 'ExerciseDbError'
  }
}

const CATALOG_JSON_PATH = path.join(process.cwd(), 'data', 'exercises.json')

let catalogCache: FreeExerciseRecord[] | null = null

function loadCatalog(): FreeExerciseRecord[] {
  if (catalogCache) return catalogCache

  try {
    catalogCache = JSON.parse(
      readFileSync(CATALOG_JSON_PATH, 'utf8')
    ) as FreeExerciseRecord[]
  } catch {
    throw new ExerciseDbError(
      'Exercise catalog data is missing. Run yarn workspace next-app sync:exercise-catalog.'
    )
  }

  return catalogCache
}

function normalizeExercise(record: FreeExerciseRecord): ExerciseDbExercise {
  const primaryMuscles = record.primaryMuscles ?? []
  const target =
    primaryMuscles.length > 0
      ? primaryMuscles.map(formatLabel).join(', ')
      : '—'

  return {
    id: record.id,
    name: record.name,
    bodyPart: record.category ? formatLabel(record.category) : '—',
    target,
    equipment: record.equipment ? formatLabel(record.equipment) : '—',
    secondaryMuscles: record.secondaryMuscles,
    instructions: record.instructions,
    difficulty: record.level,
    category: record.category,
  }
}

function formatLabel(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function getRecordById(id: string) {
  return loadCatalog().find((record) => record.id === id) ?? null
}

export function isExerciseDbConfigured() {
  try {
    loadCatalog()
    return true
  } catch {
    return false
  }
}

let catalogSeedRowsCache: ReturnType<typeof buildCatalogSeedRows> | null = null

function buildCatalogSeedRows() {
  return loadCatalog().map((record) =>
    mapExerciseDbToRow(normalizeExercise(record))
  )
}

export function getCatalogExerciseCount() {
  return loadCatalog().length
}

export function getCatalogSeedRows() {
  if (!catalogSeedRowsCache) {
    catalogSeedRowsCache = buildCatalogSeedRows()
  }
  return catalogSeedRowsCache
}

export async function fetchExerciseDbLists() {
  const records = loadCatalog()
  const bodyParts = uniqueSorted(
    records.map((record) => record.category).filter(Boolean) as string[]
  )
  const equipment = uniqueSorted(
    records.map((record) => record.equipment).filter(Boolean) as string[]
  )
  const targets = uniqueSorted(records.flatMap((record) => record.primaryMuscles ?? []))

  return {
    bodyParts: bodyParts.map(formatLabel),
    equipment: equipment.map(formatLabel),
    targets: targets.map(formatLabel),
  }
}

export function getExerciseMuscleFilterOptions() {
  const records = loadCatalog()
  const muscles = uniqueSorted(
    records.flatMap((record) => [
      ...(record.primaryMuscles ?? []),
      ...(record.secondaryMuscles ?? []),
    ])
  )

  return muscles.map(formatLabel)
}

export async function fetchExerciseDbById(id: string) {
  const record = getRecordById(id)
  if (!record) {
    throw new ExerciseDbError('Exercise not found in catalog.', 404)
  }
  return normalizeExercise(record)
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
  const normalizedQuery = query?.trim().toLowerCase()
  const normalizedBodyPart = bodyPart?.trim().toLowerCase()
  const normalizedEquipment = equipment?.trim().toLowerCase()
  const normalizedTarget = target?.trim().toLowerCase()

  const filtered = loadCatalog()
    .filter((record) => {
      if (normalizedBodyPart) {
        const category = record.category?.toLowerCase() ?? ''
        if (category !== normalizedBodyPart) return false
      }

      if (normalizedEquipment) {
        const itemEquipment = record.equipment?.toLowerCase() ?? ''
        if (itemEquipment !== normalizedEquipment) return false
      }

      if (normalizedTarget) {
        const muscles = (record.primaryMuscles ?? []).map((muscle) =>
          muscle.toLowerCase()
        )
        if (!muscles.includes(normalizedTarget)) return false
      }

      if (normalizedQuery) {
        const haystack = [
          record.name,
          record.category,
          record.equipment,
          ...(record.primaryMuscles ?? []),
          ...(record.secondaryMuscles ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(normalizedQuery)) return false
      }

      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const page = filtered.slice(offset, offset + pageSize)

  return {
    exercises: page.map(normalizeExercise),
    offset,
    limit: pageSize,
    hasMore: offset + pageSize < filtered.length,
  }
}

export function mapExerciseDbToRow(exercise: ExerciseDbExercise) {
  const record = getRecordById(exercise.id)
  const instructions = (record?.instructions ?? [])
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n\n')

  const muscleGroup = [
    ...(record?.primaryMuscles ?? []),
    ...(record?.secondaryMuscles ?? []),
  ]
    .map(formatLabel)
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

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))
}
