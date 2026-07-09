import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildExportedCoachingEventSummary,
  appointmentInstantMatches,
  googleEventMatchesCoachingAppointment,
  shouldRemoveAppointmentAfterGoogleDeletion,
} from '@/lib/google-calendar/coaching-google-matching'

const appointment = {
  id: 'appt-1',
  starts_at: '2026-07-10T15:00:00.000Z',
  ends_at: '2026-07-10T16:00:00.000Z',
  google_calendar_event_id: 'google-event-1',
  session_type: 'coaching',
  client: { full_name: 'Alex Client' },
}

test('buildExportedCoachingEventSummary uses session label and client name', () => {
  assert.equal(
    buildExportedCoachingEventSummary('coaching', 'Alex Client'),
    'Coaching session — Alex Client'
  )
})

test('appointmentInstantMatches treats equivalent instants with different offsets as equal', () => {
  assert.equal(
    appointmentInstantMatches(
      '2026-07-10T15:00:00.000Z',
      '2026-07-10T16:00:00.000Z',
      '2026-07-10T11:00:00-04:00',
      '2026-07-10T12:00:00-04:00'
    ),
    true
  )
})

test('googleEventMatchesCoachingAppointment matches linked recurring instance ids', () => {
  assert.equal(
    googleEventMatchesCoachingAppointment(
      {
        id: 'google-event-1_20260710T150000Z',
        status: 'cancelled',
        summary: 'Coaching session — Alex Client',
        start: { dateTime: appointment.starts_at },
        end: { dateTime: appointment.ends_at },
      },
      appointment
    ),
    true
  )
})

test('shouldRemoveAppointmentAfterGoogleDeletion removes linked appointments with cancelled Google events', () => {
  assert.equal(
    shouldRemoveAppointmentAfterGoogleDeletion(appointment, [
      {
        id: 'google-event-1',
        status: 'cancelled',
        summary: 'Coaching session — Alex Client',
        start: { dateTime: appointment.starts_at },
        end: { dateTime: appointment.ends_at },
      },
    ]),
    true
  )
})

test('shouldRemoveAppointmentAfterGoogleDeletion keeps unexported SwiftCoach-only sessions', () => {
  assert.equal(
    shouldRemoveAppointmentAfterGoogleDeletion(
      {
        ...appointment,
        google_calendar_event_id: null,
      },
      []
    ),
    false
  )
})

test('shouldRemoveAppointmentAfterGoogleDeletion removes unlinked exported sessions deleted in Google', () => {
  assert.equal(
    shouldRemoveAppointmentAfterGoogleDeletion(
      {
        ...appointment,
        google_calendar_event_id: null,
      },
      [
        {
          id: 'google-event-2',
          status: 'cancelled',
          summary: 'Coaching session — Alex Client',
          start: { dateTime: appointment.starts_at },
          end: { dateTime: appointment.ends_at },
        },
      ]
    ),
    true
  )
})
