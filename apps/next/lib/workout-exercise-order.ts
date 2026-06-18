import { EXERCISE_BLOCK_OPTIONS } from '@/lib/exercise-groups'
import type { ScheduledExerciseBlock } from 'app/types/database'

export type OrderedExerciseRow = {
  id: string
  sort_order: number
  exercise_block: ScheduledExerciseBlock | null
}

const BLOCK_RANK = new Map<ScheduledExerciseBlock, number>(
  EXERCISE_BLOCK_OPTIONS.map((option, index) => [option.value, index])
)

/** Unsectioned exercises sort after all labeled blocks. */
const UNSECTIONED_RANK = EXERCISE_BLOCK_OPTIONS.length

export function getExerciseBlockRank(
  block: ScheduledExerciseBlock | null | undefined
): number {
  if (!block) return UNSECTIONED_RANK
  return BLOCK_RANK.get(block) ?? UNSECTIONED_RANK
}

function sortByOrder(rows: OrderedExerciseRow[]): OrderedExerciseRow[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Returns the index (0..length) where a new exercise should be inserted so it
 * lands in the correct section — after peers with the same block, or by canonical
 * block order when no peers exist yet.
 */
export function computeInsertIndex(
  exercises: OrderedExerciseRow[],
  newBlock: ScheduledExerciseBlock | null,
  excludeId?: string
): number {
  const sorted = sortByOrder(
    excludeId ? exercises.filter((row) => row.id !== excludeId) : exercises
  )

  if (newBlock) {
    let lastSameBlockIndex = -1
    for (let index = 0; index < sorted.length; index++) {
      if (sorted[index].exercise_block === newBlock) {
        lastSameBlockIndex = index
      }
    }
    if (lastSameBlockIndex >= 0) {
      return lastSameBlockIndex + 1
    }

    const newRank = getExerciseBlockRank(newBlock)
    for (let index = 0; index < sorted.length; index++) {
      if (getExerciseBlockRank(sorted[index].exercise_block) > newRank) {
        return index
      }
    }
    return sorted.length
  }

  let lastUnsectionedIndex = -1
  for (let index = 0; index < sorted.length; index++) {
    if (sorted[index].exercise_block == null) {
      lastUnsectionedIndex = index
    }
  }
  if (lastUnsectionedIndex >= 0) {
    return lastUnsectionedIndex + 1
  }

  return sorted.length
}

/** Build a full id list with `newId` inserted at the computed section position. */
export function buildOrderedIdsAfterInsert(
  exercises: OrderedExerciseRow[],
  newId: string,
  newBlock: ScheduledExerciseBlock | null,
  excludeId?: string
): string[] {
  const sorted = sortByOrder(
    excludeId ? exercises.filter((row) => row.id !== excludeId) : exercises
  )
  const insertIndex = computeInsertIndex(exercises, newBlock, excludeId)
  const ids = sorted.map((row) => row.id)
  ids.splice(insertIndex, 0, newId)
  return ids
}

/** Reassign contiguous sort_order values (0..n-1) from an ordered id list. */
export function sortOrdersFromIds(orderedIds: string[]): Map<string, number> {
  const map = new Map<string, number>()
  orderedIds.forEach((id, index) => map.set(id, index))
  return map
}
