import assert from 'node:assert/strict'
import test from 'node:test'

import { computeAvailableSlots } from '@/lib/session-booking-slots'
import {
  defaultSessionBookingSettings,
  type CoachingAppointment,
} from '@/lib/session-booking-types'

const settings = {
  ...defaultSessionBookingSettings,
  default_session_duration_minutes: 60,
  booking_buffer_minutes: 0,
  booking_min_notice_hours: 0,
  booking_max_days_ahead: 30,
}

const rules = [
  {
    id: 'rule-1',
    coach_id: 'coach-1',
    day_of_week: 1,
    start_time: '09:00:00',
    end_time: '17:00:00',
  },
]

function googleBusyAppointment(
  startsAt: string,
  endsAt: string
): CoachingAppointment {
  return {
    id: 'google-busy-0',
    coach_id: 'coach-1',
    client_id: '',
    starts_at: startsAt,
    ends_at: endsAt,
    status: 'scheduled',
    location: null,
    notes: null,
    pre_session_notes: null,
    post_session_notes: null,
    coaching_type: null,
    session_pack_id: null,
    booked_by: 'coach',
    cancelled_at: null,
    cancellation_reason: null,
    rescheduled_to_id: null,
    created_at: startsAt,
  }
}

test('computeAvailableSlots excludes slots overlapping Google Calendar busy intervals', () => {
  const dateKey = '2026-07-06'
  const referenceDate = new Date('2026-07-06T08:00:00.000Z')

  const withoutBusy = computeAvailableSlots({
    dateKeys: [dateKey],
    rules,
    exceptions: [],
    appointments: [],
    settings,
    timezone: 'UTC',
    referenceDate,
    ignoreMinNotice: true,
  })

  const withBusy = computeAvailableSlots({
    dateKeys: [dateKey],
    rules,
    exceptions: [],
    appointments: [
      googleBusyAppointment(
        '2026-07-06T10:00:00.000Z',
        '2026-07-06T11:00:00.000Z'
      ),
    ],
    settings,
    timezone: 'UTC',
    referenceDate,
    ignoreMinNotice: true,
  })

  assert.equal(
    withoutBusy.some((slot) => slot.startsAt === '2026-07-06T10:00:00.000Z'),
    true
  )
  assert.equal(
    withBusy.some((slot) => slot.startsAt === '2026-07-06T10:00:00.000Z'),
    false
  )
  assert.ok(withBusy.length < withoutBusy.length)
})
