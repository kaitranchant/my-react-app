import { SUPERSET_GROUP_OPTIONS } from '@/lib/exercise-groups'

const SUPERSET_COLORS: Record<string, string> = {
  A: 'bg-sky-500',
  B: 'bg-violet-500',
  C: 'bg-amber-500',
  D: 'bg-rose-500',
  E: 'bg-emerald-500',
  F: 'bg-orange-500',
}

export function getSupersetColor(group: string | null): string {
  if (!group) return 'bg-muted-foreground'
  return SUPERSET_COLORS[group] ?? 'bg-muted-foreground'
}

export function getUsedSupersetGroups(
  exercises: { superset_group: string | null }[]
): string[] {
  const used = new Set<string>()
  for (const row of exercises) {
    if (row.superset_group) used.add(row.superset_group)
  }
  return Array.from(used).sort()
}

export function getNextSupersetGroup(
  exercises: { superset_group: string | null }[]
): string {
  const used = new Set(getUsedSupersetGroups(exercises))
  return SUPERSET_GROUP_OPTIONS.find((letter) => !used.has(letter)) ?? 'A'
}

export type SupersetCluster<T> =
  | { type: 'single'; exercise: T }
  | { type: 'superset'; group: string; exercises: T[] }

export type SupersetPosition = {
  group: string
  index: number
  total: number
}

/** Position of an exercise within its superset group (1-based index). */
export function getSupersetPosition<T extends { id: string; superset_group: string | null }>(
  exercise: T,
  exercises: T[]
): SupersetPosition | null {
  const group = exercise.superset_group
  if (!group) return null

  const inGroup = exercises.filter((row) => row.superset_group === group)
  if (inGroup.length <= 1) return null

  const index = inGroup.findIndex((row) => row.id === exercise.id)
  if (index < 0) return null

  return { group, index: index + 1, total: inGroup.length }
}

/** Group consecutive exercises that share the same superset letter. */
export function clusterExercisesBySuperset<T extends { superset_group: string | null }>(
  exercises: T[]
): SupersetCluster<T>[] {
  const clusters: SupersetCluster<T>[] = []

  for (const exercise of exercises) {
    const group = exercise.superset_group
    const last = clusters[clusters.length - 1]

    if (
      group &&
      last?.type === 'superset' &&
      last.group === group
    ) {
      last.exercises.push(exercise)
      continue
    }

    if (group) {
      clusters.push({ type: 'superset', group, exercises: [exercise] })
    } else {
      clusters.push({ type: 'single', exercise })
    }
  }

  return clusters
}
