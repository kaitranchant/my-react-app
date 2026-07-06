import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { CoachingAppointment } from '@/lib/session-booking-types'
import {
  buildClientSessionProgressMap,
  countScheduledSessionsForClient,
  resolveClientTarget,
  weekOverridesFromRows,
} from '@/lib/weekly-session-targets'

function appointment(
  overrides: Partial<CoachingAppointment> & Pick<CoachingAppointment, 'client_id' | 'status'>
): CoachingAppointment {
  return {
    id: 'apt-1',
    coach_id: 'coach-1',
    client_id: overrides.client_id,
    starts_at: '2026-07-06T16:00:00.000Z',
    ends_at: '2026-07-06T17:00:00.000Z',
    status: overrides.status,
    location: null,
    notes: null,
    pre_session_notes: null,
    post_session_notes: null,
    coaching_type: null,
    session_type: 'coaching',
    session_pack_id: null,
    series_id: null,
    booked_by: 'coach',
    cancelled_at: null,
    cancellation_reason: null,
    rescheduled_to_id: null,
    created_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

test('resolveClientTarget prefers week override over client default', () => {
  const defaults = new Map([['client-1', 2]])
  const overrides = new Map([['client-1', 3]])

  assert.equal(resolveClientTarget('client-1', defaults, overrides), 3)
})

test('resolveClientTarget falls back to client default', () => {
  const defaults = new Map([['client-1', 2]])
  const overrides = new Map<string, number>()

  assert.equal(resolveClientTarget('client-1', defaults, overrides), 2)
})

test('resolveClientTarget returns null when no target is set', () => {
  const defaults = new Map([['client-1', null]])
  const overrides = new Map<string, number>()

  assert.equal(resolveClientTarget('client-1', defaults, overrides), null)
})

test('countScheduledSessionsForClient counts scheduled and completed only', () => {
  const appointments = [
    appointment({ client_id: 'client-1', status: 'scheduled', id: 'a1' }),
    appointment({ client_id: 'client-1', status: 'completed', id: 'a2' }),
    appointment({ client_id: 'client-1', status: 'cancelled', id: 'a3' }),
    appointment({ client_id: 'client-2', status: 'scheduled', id: 'a4' }),
  ]

  assert.equal(countScheduledSessionsForClient(appointments, 'client-1'), 2)
})

test('buildClientSessionProgressMap returns empty map when feature disabled', () => {
  const appointments = [
    appointment({ client_id: 'client-1', status: 'scheduled' }),
  ]
  const defaults = new Map([['client-1', 2]])

  const progress = buildClientSessionProgressMap(
    appointments,
    defaults,
    new Map(),
    false
  )

  assert.equal(progress.size, 0)
})

test('buildClientSessionProgressMap builds scheduled and target counts', () => {
  const appointments = [
    appointment({ client_id: 'client-1', status: 'scheduled', id: 'a1' }),
    appointment({ client_id: 'client-1', status: 'scheduled', id: 'a2' }),
    appointment({ client_id: 'client-2', status: 'scheduled', id: 'a3' }),
  ]
  const defaults = new Map([
    ['client-1', 2],
    ['client-2', 1],
  ])

  const progress = buildClientSessionProgressMap(
    appointments,
    defaults,
    new Map(),
    true
  )

  assert.deepEqual(progress.get('client-1'), { scheduled: 2, target: 2 })
  assert.deepEqual(progress.get('client-2'), { scheduled: 1, target: 1 })
})

test('weekOverridesFromRows maps client ids to targets', () => {
  const overrides = weekOverridesFromRows([
    { client_id: 'client-1', target_sessions: 4 },
  ])

  assert.equal(overrides.get('client-1'), 4)
})
