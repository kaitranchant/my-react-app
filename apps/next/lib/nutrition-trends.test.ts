import assert from 'node:assert/strict'
import test from 'node:test'

import {
  averageAdherenceScore,
  buildNutritionTrendPoints,
  getAdherenceColor,
} from './nutrition-trends'
import type { ClientNutritionLog } from 'app/types/database'

const logs: ClientNutritionLog[] = [
  {
    id: '1',
    client_id: 'client-1',
    coach_id: 'coach-1',
    log_date: '2026-06-01',
    adherence_score: 4,
    client_notes: null,
    fiber_g: null,
    water_ml: null,
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  },
  {
    id: '2',
    client_id: 'client-1',
    coach_id: 'coach-1',
    log_date: '2026-06-02',
    adherence_score: 2,
    client_notes: null,
    fiber_g: null,
    water_ml: null,
    created_at: '2026-06-02T00:00:00Z',
    updated_at: '2026-06-02T00:00:00Z',
  },
]

test('buildNutritionTrendPoints sorts chronologically and limits points', () => {
  const points = buildNutritionTrendPoints(logs, 7)
  assert.equal(points.length, 2)
  assert.equal(points[0]?.dateKey, '2026-06-01')
  assert.equal(points[1]?.adherenceScore, 2)
  assert.equal(points[0]?.colorClass, 'bg-emerald-500')
  assert.equal(points[1]?.colorClass, 'bg-red-500')
})

test('averageAdherenceScore averages adherence values', () => {
  assert.equal(averageAdherenceScore(logs), 3)
})

test('getAdherenceColor maps scores to colors', () => {
  assert.equal(getAdherenceColor(5), 'green')
  assert.equal(getAdherenceColor(3), 'amber')
  assert.equal(getAdherenceColor(1), 'red')
})
