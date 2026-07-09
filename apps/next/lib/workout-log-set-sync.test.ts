import assert from 'node:assert/strict'
import test from 'node:test'

import { syncWorkoutLogSetsForExercises } from '@/lib/workout-log-set-sync'

type DeleteCall = {
  table: string
  filters: Record<string, unknown>
}

function createMockSupabase(onDelete: (call: DeleteCall) => void) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {}

      const builder = {
        delete() {
          return builder
        },
        eq(column: string, value: unknown) {
          filters[column] = value
          return builder
        },
        gt(column: string, value: unknown) {
          filters[`${column}__gt`] = value
          return builder
        },
        not(column: string, operator: string, value: unknown) {
          filters[`${column}__not_${operator}`] = value
          return builder
        },
        then(
          resolve: (value: { error: null }) => void,
          reject?: (reason: unknown) => void
        ) {
          try {
            onDelete({ table, filters })
            resolve({ error: null })
          } catch (error) {
            reject?.(error)
          }
        },
      }

      return builder
    },
  }
}

test('syncWorkoutLogSetsForExercises scopes deletes to the workout id', async () => {
  const deleteCalls: DeleteCall[] = []
  const supabase = createMockSupabase((call) => {
    deleteCalls.push(call)
  })

  const result = await syncWorkoutLogSetsForExercises(
    supabase as never,
    'workout-a',
    [{ scheduledExerciseId: 'exercise-a', setNumber: 1 }],
    new Set(['exercise-a'])
  )

  assert.equal(result.success, true)
  assert.equal(deleteCalls.length, 2)
  for (const call of deleteCalls) {
    assert.equal(call.filters.scheduled_workout_id, 'workout-a')
    assert.equal(call.filters.scheduled_exercise_id, 'exercise-a')
  }
})

test('syncWorkoutLogSetsForExercises skips sync when save payload is empty', async () => {
  let deleteCount = 0
  const supabase = createMockSupabase(() => {
    deleteCount += 1
  })

  const result = await syncWorkoutLogSetsForExercises(
    supabase as never,
    'workout-a',
    [],
    new Set(['exercise-a'])
  )

  assert.equal(result.success, true)
  assert.equal(deleteCount, 0)
})
