import type { CoachingAppointment } from '@/lib/session-booking-types'
import type { CoachingAppointmentStatus } from 'app/types/database'

export type ClientSessionProgress = {
  scheduled: number
  target: number
}

export type ClientWeeklySessionTargetRow = {
  client_id: string
  target_sessions: number
}

export type ClientWeeklySessionDefault = {
  id: string
  full_name: string | null
  weekly_session_target?: number | null
}

const ACTIVE_STATUSES: CoachingAppointmentStatus[] = ['scheduled', 'completed']

export function isActiveAppointmentStatus(
  status: CoachingAppointmentStatus
): boolean {
  return ACTIVE_STATUSES.includes(status)
}

export function countScheduledSessionsForClient(
  appointments: CoachingAppointment[],
  clientId: string
): number {
  return appointments.filter(
    (appointment) =>
      appointment.client_id === clientId &&
      isActiveAppointmentStatus(appointment.status)
  ).length
}

export function resolveClientTarget(
  clientId: string,
  clientDefaults: Map<string, number | null>,
  weekOverrides: Map<string, number>
): number | null {
  const override = weekOverrides.get(clientId)
  if (override !== undefined) {
    return override
  }

  return clientDefaults.get(clientId) ?? null
}

export function buildClientSessionProgressMap(
  appointments: CoachingAppointment[],
  clientDefaults: Map<string, number | null>,
  weekOverrides: Map<string, number>,
  weeklyTargetsEnabled: boolean
): Map<string, ClientSessionProgress> {
  const progress = new Map<string, ClientSessionProgress>()
  if (!weeklyTargetsEnabled) {
    return progress
  }

  const clientIds = new Set<string>()
  for (const appointment of appointments) {
    clientIds.add(appointment.client_id)
  }
  for (const [clientId, defaultTarget] of Array.from(clientDefaults.entries())) {
    if (defaultTarget != null || weekOverrides.has(clientId)) {
      clientIds.add(clientId)
    }
  }

  for (const clientId of Array.from(clientIds)) {
    const target = resolveClientTarget(clientId, clientDefaults, weekOverrides)
    if (target === null) {
      continue
    }

    progress.set(clientId, {
      scheduled: countScheduledSessionsForClient(appointments, clientId),
      target,
    })
  }

  return progress
}

export function clientDefaultsFromClients(
  clients: Array<{ id: string; weekly_session_target?: number | null }>
): Map<string, number | null> {
  return new Map(
    clients.map((client) => [client.id, client.weekly_session_target ?? null])
  )
}

export function weekOverridesFromRows(
  rows: ClientWeeklySessionTargetRow[]
): Map<string, number> {
  return new Map(rows.map((row) => [row.client_id, row.target_sessions]))
}

export function clientDisplayName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim()
  return trimmed || 'Client'
}

export function clientFirstName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim()
  if (!trimmed) {
    return 'Client'
  }
  return trimmed.split(/\s+/)[0] ?? trimmed
}
