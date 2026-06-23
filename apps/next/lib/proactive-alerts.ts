import { isAcwrLoadAlert, type AcwrRiskLevel } from '@/lib/load-analytics'

export const PROACTIVE_INACTIVE_DAYS_THRESHOLD = 4
export const MAX_PROACTIVE_ALERTS = 8

export type ClientDashboardAlertContext = {
  clientId: string
  clientName: string
  daysSinceLastSession: number | null
  acwrRatio: number | null
  acwrRiskLevel: AcwrRiskLevel
  hasInjuryFlag: boolean
}

export type ProactiveAlert = {
  id: string
  message: string
  href: string
  priority: 'high' | 'medium' | 'low'
  kind: 'inactive' | 'acwr' | 'injury' | 'check_in'
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const

export function buildProactiveAlerts({
  clientContexts,
  pendingCheckInsCount = 0,
  inactiveDaysThreshold = PROACTIVE_INACTIVE_DAYS_THRESHOLD,
}: {
  clientContexts: ClientDashboardAlertContext[]
  pendingCheckInsCount?: number
  inactiveDaysThreshold?: number
}): ProactiveAlert[] {
  const alerts: ProactiveAlert[] = []

  if (pendingCheckInsCount > 0) {
    alerts.push({
      id: 'pending-check-ins',
      message: `${pendingCheckInsCount} client check-in${pendingCheckInsCount === 1 ? '' : 's'} awaiting review`,
      href: '/check-ins',
      priority: 'high',
      kind: 'check_in',
    })
  }

  for (const client of clientContexts) {
    const displayName = getFirstName(client.clientName)

    if (client.hasInjuryFlag) {
      alerts.push({
        id: `injury-${client.clientId}`,
        message: `${displayName} flagged pain in a recent check-in`,
        href: `/clients/${client.clientId}?tab=check-ins`,
        priority: 'high',
        kind: 'injury',
      })
    }

    if (isAcwrLoadAlert(client.acwrRiskLevel, client.acwrRatio)) {
      const ratio = client.acwrRatio!.toFixed(2)
      const message =
        client.acwrRiskLevel === 'overreaching'
          ? `${displayName}'s ACWR hit ${ratio} — consider reducing load this week`
          : `${displayName}'s ACWR is at ${ratio} — monitor load closely`

      alerts.push({
        id: `acwr-${client.clientId}`,
        message,
        href: `/load?client=${client.clientId}`,
        priority: client.acwrRiskLevel === 'overreaching' ? 'high' : 'medium',
        kind: 'acwr',
      })
    }

    if (
      client.daysSinceLastSession !== null &&
      client.daysSinceLastSession >= inactiveDaysThreshold
    ) {
      const days = client.daysSinceLastSession
      alerts.push({
        id: `inactive-${client.clientId}`,
        message: `${displayName} hasn't trained in ${days} day${days === 1 ? '' : 's'}`,
        href: `/clients/${client.clientId}?tab=training`,
        priority: days >= 7 ? 'high' : 'medium',
        kind: 'inactive',
      })
    }
  }

  return alerts
    .sort((left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority])
    .slice(0, MAX_PROACTIVE_ALERTS)
}
