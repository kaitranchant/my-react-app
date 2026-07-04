import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  isCoachTaskOverdue,
  sortCoachTasks,
  type CoachTask,
} from './coach-tasks'

function makeTask(overrides: Partial<CoachTask>): CoachTask {
  return {
    id: overrides.id ?? 'task-1',
    coach_id: 'coach-1',
    client_id: null,
    title: overrides.title ?? 'Task',
    details: null,
    due_date: overrides.due_date ?? null,
    priority: overrides.priority ?? 'normal',
    status: overrides.status ?? 'pending',
    completed_at: overrides.completed_at ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
    client: null,
  }
}

describe('coach-tasks', () => {
  it('detects overdue pending tasks', () => {
    assert.equal(
      isCoachTaskOverdue(
        makeTask({ due_date: '2026-01-01', status: 'pending' }),
        '2026-01-05'
      ),
      true
    )
    assert.equal(
      isCoachTaskOverdue(
        makeTask({ due_date: '2026-01-01', status: 'completed' }),
        '2026-01-05'
      ),
      false
    )
  })

  it('sorts pending tasks with overdue and due dates first', () => {
    const sorted = sortCoachTasks(
      [
        makeTask({ id: 'later', due_date: '2026-01-10' }),
        makeTask({ id: 'overdue', due_date: '2026-01-01' }),
        makeTask({ id: 'none' }),
        makeTask({
          id: 'done',
          status: 'completed',
          completed_at: '2026-01-04T00:00:00.000Z',
        }),
      ],
      '2026-01-05'
    )

    assert.deepEqual(
      sorted.map((task) => task.id),
      ['overdue', 'later', 'none', 'done']
    )
  })
})
