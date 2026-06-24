export function isAppointmentWithinReminderWindow(
  startsAt: string,
  reminderHours: number,
  now = new Date()
): boolean {
  const startMs = new Date(startsAt).getTime()
  const nowMs = now.getTime()
  if (startMs <= nowMs) {
    return false
  }

  const hoursUntilStart = (startMs - nowMs) / (60 * 60 * 1000)
  return hoursUntilStart <= reminderHours
}

export function getAppointmentReminderReferenceKey(appointmentId: string): string {
  return appointmentId
}
