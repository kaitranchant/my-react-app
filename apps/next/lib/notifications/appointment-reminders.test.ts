import assert from 'node:assert/strict'
import test from 'node:test'

import { isAppointmentWithinReminderWindow } from '@/lib/notifications/appointment-reminders'

test('isAppointmentWithinReminderWindow is true inside reminder horizon', () => {
  const now = new Date('2026-06-24T08:00:00.000Z')
  const startsAt = '2026-06-24T20:00:00.000Z'

  assert.equal(isAppointmentWithinReminderWindow(startsAt, 24, now), true)
})

test('isAppointmentWithinReminderWindow is false after session start', () => {
  const now = new Date('2026-06-24T21:00:00.000Z')
  const startsAt = '2026-06-24T20:00:00.000Z'

  assert.equal(isAppointmentWithinReminderWindow(startsAt, 24, now), false)
})

test('isAppointmentWithinReminderWindow is false beyond reminder horizon', () => {
  const now = new Date('2026-06-24T08:00:00.000Z')
  const startsAt = '2026-06-26T20:00:00.000Z'

  assert.equal(isAppointmentWithinReminderWindow(startsAt, 24, now), false)
})
