'use client'

import type { CoachingAppointment } from '@/lib/session-booking-types'

export function computeWeekStats(appointments: CoachingAppointment[]) {
  const active = appointments.filter(
    (appointment) =>
      appointment.status === 'scheduled' || appointment.status === 'completed'
  )

  const totalMinutes = active.reduce((sum, appointment) => {
    const start = new Date(appointment.starts_at).getTime()
    const end = new Date(appointment.ends_at).getTime()
    return sum + Math.max(0, (end - start) / 60_000)
  }, 0)

  const uniqueClients = new Set(active.map((appointment) => appointment.client_id))

  return {
    sessionCount: active.length,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    clientCount: uniqueClients.size,
  }
}

type SchedulingWeekStatsProps = {
  appointments: CoachingAppointment[]
}

export function SchedulingWeekStats({ appointments }: SchedulingWeekStatsProps) {
  const stats = computeWeekStats(appointments)
  const sessionLabel = stats.sessionCount === 1 ? 'session' : 'sessions'
  const clientLabel = stats.clientCount === 1 ? 'client' : 'clients'
  const hoursLabel =
    stats.totalHours === 1 ? '1 hour' : `${stats.totalHours} hours`

  return (
    <div className="bg-muted/50 text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-4 py-3 text-sm">
      <span className="text-foreground font-medium">
        {stats.sessionCount} {sessionLabel} this week
      </span>
      <span aria-hidden>·</span>
      <span>{hoursLabel} total</span>
      <span aria-hidden>·</span>
      <span>
        {stats.clientCount} {clientLabel}
      </span>
    </div>
  )
}
