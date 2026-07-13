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

export type ProactiveAlertKind = 'inactive' | 'acwr' | 'injury' | 'check_in'

export type ProactiveAlert = {
  id: string
  message: string
  href: string
  priority: 'high' | 'medium' | 'low'
  kind: ProactiveAlertKind
  signature: string
  clientId: string | null
}

export type ProactiveAlertDismissal = {
  alertId: string
  signature: string
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName
}

/** UTC ISO week key so sticky alerts can reappear next week. */
export function getProactiveAlertWeekKey(referenceDate = new Date()): string {
  const date = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  )
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function buildAcwrAlertSignature(
  ratio: number,
  riskLevel: AcwrRiskLevel
): string {
  return `${ratio.toFixed(2)}:${riskLevel}`
}

export function buildInactiveAlertSignature(daysSinceLastSession: number): string {
  const bucket = daysSinceLastSession >= 7 ? '7+' : '4+'
  return `${getProactiveAlertWeekKey()}:${bucket}:${daysSinceLastSession}`
}

export function buildInjuryAlertSignature(): string {
  return `week:${getProactiveAlertWeekKey()}`
}

export function buildCheckInAlertSignature(pendingCheckInsCount: number): string {
  return `count:${pendingCheckInsCount}`
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
      signature: buildCheckInAlertSignature(pendingCheckInsCount),
      clientId: null,
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
        signature: buildInjuryAlertSignature(),
        clientId: client.clientId,
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
        signature: buildAcwrAlertSignature(
          client.acwrRatio!,
          client.acwrRiskLevel
        ),
        clientId: client.clientId,
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
        signature: buildInactiveAlertSignature(days),
        clientId: client.clientId,
      })
    }
  }

  return alerts
    .sort((left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority])
    .slice(0, MAX_PROACTIVE_ALERTS)
}

export function filterDismissedProactiveAlerts(
  alerts: ProactiveAlert[],
  dismissals: ProactiveAlertDismissal[]
): ProactiveAlert[] {
  if (dismissals.length === 0) {
    return alerts
  }

  const signaturesByAlertId = new Map(
    dismissals.map((dismissal) => [dismissal.alertId, dismissal.signature])
  )

  return alerts.filter((alert) => {
    const dismissedSignature = signaturesByAlertId.get(alert.id)
    if (dismissedSignature == null) {
      return true
    }
    return dismissedSignature !== alert.signature
  })
}
