import assert from 'node:assert/strict'
import test from 'node:test'

import { computeAvailableSlots } from '@/lib/session-booking-slots'
import { defaultSessionBookingSettings } from '@/lib/session-booking-types'

const settings = {
  ...defaultSessionBookingSettings,
  default_session_duration_minutes: 60,
  booking_buffer_minutes: 15,
  booking_min_notice_hours: 0,
  booking_max_days_ahead: 30,
}

test('computeAvailableSlots offers half-hour start times within availability windows', () => {
  const dateKey = '2026-07-01'
  const referenceDate = new Date('2026-07-01T12:40:00.000Z')

  const slots = computeAvailableSlots({
    dateKeys: [dateKey],
    rules: [
      {
        id: 'rule-1',
        coach_id: 'coach-1',
        day_of_week: 3,
        start_time: '08:00:00',
        end_time: '18:00:00',
      },
    ],
    exceptions: [],
    appointments: [],
    settings,
    timezone: 'UTC',
    referenceDate,
    ignoreMinNotice: true,
  })

  assert.equal(
    slots.some((slot) => slot.startsAt === '2026-07-01T16:30:00.000Z'),
    true,
    'expected a 4:30 PM slot for a 60-minute session'
  )
  assert.equal(
    slots.some((slot) => slot.startsAt === '2026-07-01T16:00:00.000Z'),
    true,
    'expected a 4:00 PM slot'
  )
  assert.equal(
    slots.some((slot) => slot.startsAt === '2026-07-01T17:00:00.000Z'),
    true,
    'expected a 5:00 PM slot'
  )
})

test('computeAvailableSlots matches painted 30-minute grid cells', () => {
  const dateKey = '2026-07-01'
  const referenceDate = new Date('2026-07-01T12:40:00.000Z')

  const slots = computeAvailableSlots({
    dateKeys: [dateKey],
    rules: [
      {
        id: 'rule-afternoon',
        coach_id: 'coach-1',
        day_of_week: 3,
        start_time: '16:30:00',
        end_time: '19:00:00',
      },
    ],
    exceptions: [],
    appointments: [],
    settings,
    timezone: 'UTC',
    referenceDate,
    ignoreMinNotice: true,
  })

  assert.equal(
    slots.some((slot) => slot.startsAt === '2026-07-01T16:30:00.000Z'),
    true,
    '4:30 PM should be offered when 4:30 and 5:00 cells are painted'
  )
  assert.equal(
    slots.some((slot) => slot.startsAt === '2026-07-01T17:30:00.000Z'),
    true,
    '5:30 PM should be offered when enough cells are painted'
  )
  assert.equal(
    slots.some((slot) => slot.startsAt === '2026-07-01T18:00:00.000Z'),
    true,
    '6:00 PM should be the last 60-minute start in a 4:30–7:00 PM window'
  )
  assert.equal(
    slots.some((slot) => slot.startsAt === '2026-07-01T16:00:00.000Z'),
    false,
    '4:00 PM should not be offered when that cell is not painted'
  )
})

test('computeAvailableSlots requires enough painted cells for session duration', () => {
  const dateKey = '2026-07-01'
  const referenceDate = new Date('2026-07-01T12:40:00.000Z')

  const slots = computeAvailableSlots({
    dateKeys: [dateKey],
    rules: [
      {
        id: 'rule-single-cell',
        coach_id: 'coach-1',
        day_of_week: 3,
        start_time: '16:30:00',
        end_time: '17:00:00',
      },
    ],
    exceptions: [],
    appointments: [],
    settings,
    timezone: 'UTC',
    referenceDate,
    ignoreMinNotice: true,
  })

  assert.equal(slots.length, 0, 'one 30-minute cell cannot fit a 60-minute session')
})
