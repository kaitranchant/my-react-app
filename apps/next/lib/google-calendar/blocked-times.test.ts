import assert from 'node:assert/strict'
import test from 'node:test'

import {
  appointmentOccupiesCalendarSlot,
  filterGoogleCalendarBlockedTimes,
  hideBlockedTimesOverlappingAppointments,
} from '@/lib/google-calendar/blocked-times-filter'

test('filterGoogleCalendarBlockedTimes keeps Google-only coaching-style events', () => {
  const blocked = filterGoogleCalendarBlockedTimes(
    [
      {
        id: 'google-only',
        summary: 'Coaching session — Dawn Carter',
        status: 'confirmed',
        start: { dateTime: '2026-07-06T19:30:00.000Z' },
        end: { dateTime: '2026-07-06T20:30:00.000Z' },
      },
    ],
    [
      {
        starts_at: '2026-07-06T20:30:00.000Z',
        ends_at: '2026-07-06T21:30:00.000Z',
        google_calendar_event_id: 'app-export',
      },
    ]
  )

  assert.equal(blocked.length, 1)
  assert.equal(blocked[0]?.title, 'Coaching session — Dawn Carter')
})

test('filterGoogleCalendarBlockedTimes excludes linked and overlapping app sessions', () => {
  const blocked = filterGoogleCalendarBlockedTimes(
    [
      {
        id: 'linked-event',
        summary: 'Coaching session — Nikki Sharpsteen',
        status: 'confirmed',
        start: { dateTime: '2026-07-06T20:30:00.000Z' },
        end: { dateTime: '2026-07-06T21:30:00.000Z' },
      },
      {
        id: 'overlap-event',
        summary: 'Personal appointment',
        status: 'confirmed',
        start: { dateTime: '2026-07-06T21:00:00.000Z' },
        end: { dateTime: '2026-07-06T22:00:00.000Z' },
      },
      {
        id: 'free-event',
        summary: 'Dentist',
        status: 'confirmed',
        start: { dateTime: '2026-07-06T18:00:00.000Z' },
        end: { dateTime: '2026-07-06T19:00:00.000Z' },
      },
    ],
    [
      {
        starts_at: '2026-07-06T20:30:00.000Z',
        ends_at: '2026-07-06T21:30:00.000Z',
        google_calendar_event_id: 'linked-event',
      },
    ]
  )

  assert.equal(blocked.length, 1)
  assert.equal(blocked[0]?.id, 'free-event')
})

test('appointmentOccupiesCalendarSlot keeps completed and no-show sessions on the calendar', () => {
  assert.equal(appointmentOccupiesCalendarSlot('scheduled'), true)
  assert.equal(appointmentOccupiesCalendarSlot('completed'), true)
  assert.equal(appointmentOccupiesCalendarSlot('no_show'), true)
  assert.equal(appointmentOccupiesCalendarSlot('cancelled'), false)
  assert.equal(appointmentOccupiesCalendarSlot('rescheduled'), false)
})

test('hideBlockedTimesOverlappingAppointments hides busy blocks under completed sessions', () => {
  const blocked = hideBlockedTimesOverlappingAppointments(
    [
      {
        id: 'busy-event',
        startsAt: '2026-07-06T20:30:00.000Z',
        endsAt: '2026-07-06T21:30:00.000Z',
        title: 'Coaching session — Nikki Sharpsteen',
      },
    ],
    [
      {
        starts_at: '2026-07-06T20:30:00.000Z',
        ends_at: '2026-07-06T21:30:00.000Z',
        status: 'completed',
      },
    ]
  )

  assert.equal(blocked.length, 0)
})
