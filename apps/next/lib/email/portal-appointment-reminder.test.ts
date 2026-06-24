import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPortalAppointmentReminderEmailContent } from '@/lib/email/portal-appointment-reminder'

test('buildPortalAppointmentReminderEmailContent includes session time and location', () => {
  const content = buildPortalAppointmentReminderEmailContent({
    clientName: 'Alex',
    clientEmail: 'alex@example.com',
    coachName: 'Coach Kim',
    sessionWhen: 'Mon, Jun 24 · 9:00 AM – 10:00 AM',
    location: 'Studio A',
  })

  assert.match(content.subject, /Session reminder/)
  assert.match(content.text, /Coach Kim/)
  assert.match(content.text, /Studio A/)
  assert.match(content.html, /View session details/)
})
