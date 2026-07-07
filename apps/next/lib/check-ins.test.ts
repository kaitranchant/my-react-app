import test from 'node:test'
import assert from 'node:assert/strict'

import { isCheckInPendingReview, resolveCheckInReviewedAt } from '@/lib/check-ins'
import type { ClientCheckIn } from 'app/types/database'

function makeCheckIn(
  overrides: Partial<ClientCheckIn> = {}
): ClientCheckIn {
  return {
    id: 'check-in-1',
    client_id: 'client-1',
    coach_id: 'coach-1',
    check_in_date: '2026-07-01',
    weight: null,
    sleep_hours: null,
    calm_level: null,
    sleep_quality: null,
    energy_level: null,
    motivation_level: null,
    nutrition_adherence: null,
    soreness_level: null,
    soreness_notes: null,
    has_pain: false,
    pain_notes: null,
    client_notes: null,
    coach_notes: null,
    submitted_by: 'client',
    reviewed_at: null,
    created_at: '2026-07-01T12:00:00.000Z',
    updated_at: '2026-07-01T12:00:00.000Z',
    ...overrides,
  }
}

test('isCheckInPendingReview is true for unreviewed client submissions', () => {
  assert.equal(
    isCheckInPendingReview(makeCheckIn({ submitted_by: 'client', reviewed_at: null })),
    true
  )
})

test('resolveCheckInReviewedAt marks client submissions reviewed without coach notes', () => {
  const reviewedAt = resolveCheckInReviewedAt(
    { reviewed_at: null, submitted_by: 'client' },
    null
  )
  assert.ok(reviewedAt)
})

test('resolveCheckInReviewedAt keeps existing reviewed timestamp', () => {
  const reviewedAt = resolveCheckInReviewedAt(
    { reviewed_at: '2026-07-01T12:00:00.000Z', submitted_by: 'client' },
    null
  )
  assert.equal(reviewedAt, '2026-07-01T12:00:00.000Z')
})

test('resolveCheckInReviewedAt does not review coach logs without notes', () => {
  const reviewedAt = resolveCheckInReviewedAt(
    { reviewed_at: null, submitted_by: 'coach' },
    null
  )
  assert.equal(reviewedAt, null)
})
