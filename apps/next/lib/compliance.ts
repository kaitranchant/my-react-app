import { addDaysToDateKey } from '@/lib/calendar'
import { isAcwrLoadAlert } from '@/lib/load-analytics'
import { getDaysSinceLastSession } from '@/lib/client-metrics'
import { PROACTIVE_INACTIVE_DAYS_THRESHOLD } from '@/lib/proactive-alerts'
import type { ClientDashboardAlertContext } from '@/lib/proactive-alerts'
import {
  clientMatchesAttendanceScope,
  type AttendanceScope,
  type CoachTeam,
} from '@/lib/attendance'

export type ComplianceIssueKind =
  | 'missed_workout'
  | 'overdue_check_in'
  | 'pending_check_in_review'
  | 'unread_message'
  | 'pending_form_review'
  | 'missing_nutrition_log'
  | 'no_meal_plan_assigned'
  | 'elevated_load'
  | 'injury_flag'
  | 'inactive'

export type ComplianceIssue = {
  kind: ComplianceIssueKind
  priority: 'high' | 'medium' | 'low'
  label: string
  href: string
}

export type ComplianceWorkoutRow = {
  scheduled_date: string
  status: string
  completed_at: string | null
}

export type ComplianceClientInput = {
  clientId: string
  clientName: string
  avatarUrl: string | null
  gymId: string | null
  teamIds: string[]
  workouts: ComplianceWorkoutRow[]
  hasCheckInThisPeriod: boolean
  pendingCheckInReviews: number
  unreadMessages: number
  pendingFormReviews: number
  nutritionConfigured: boolean
  hasNutritionLogToday: boolean
  hasMealPlanAssigned: boolean
  loadContext: ClientDashboardAlertContext | null
}

export type ComplianceClientRow = {
  clientId: string
  clientName: string
  avatarUrl: string | null
  gymId: string | null
  teamIds: string[]
  issues: ComplianceIssue[]
  issueCount: number
  highestPriority: 'high' | 'medium' | 'low' | null
  missedWorkouts7d: number
  sessionCompliance: { completed: number; planned: number } | null
  daysSinceLastSession: number | null
  hasCheckInThisPeriod: boolean
  pendingCheckInReviews: number
  unreadMessages: number
  pendingFormReviews: number
  nutritionConfigured: boolean
  hasNutritionLogToday: boolean
  hasMealPlanAssigned: boolean
}

export type ComplianceSummary = {
  totalClients: number
  clientsNeedingAttention: number
  missedWorkouts7d: number
  overdueCheckIns: number
  pendingCheckInReviews: number
  unreadMessages: number
  pendingFormReviews: number
  missingNutritionLogs: number
  elevatedLoadClients: number
  injuryFlagClients: number
  inactiveClients: number
}

export type ComplianceFilter = 'all' | 'needs_attention'
export type ComplianceSort = 'issues' | 'name' | 'missed' | 'inactive'

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const

export function countMissedWorkouts(
  workouts: ComplianceWorkoutRow[],
  todayKey: string,
  lookbackDays = 7
): number {
  const startKey = addDaysToDateKey(todayKey, -lookbackDays)

  return workouts.filter(
    (workout) =>
      workout.scheduled_date >= startKey &&
      workout.scheduled_date < todayKey &&
      (workout.status === 'scheduled' || workout.status === 'in_progress')
  ).length
}

export function countSessionCompliance(
  workouts: ComplianceWorkoutRow[],
  weekStart: string,
  weekEnd: string
): { completed: number; planned: number } {
  const inRange = workouts.filter(
    (workout) =>
      workout.scheduled_date >= weekStart && workout.scheduled_date <= weekEnd
  )

  return {
    planned: inRange.filter((workout) => workout.status !== 'skipped').length,
    completed: inRange.filter((workout) => workout.status === 'completed').length,
  }
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName
}

function highestIssuePriority(
  issues: ComplianceIssue[]
): 'high' | 'medium' | 'low' | null {
  if (issues.length === 0) return null

  return issues.reduce<'high' | 'medium' | 'low'>((best, issue) => {
    return PRIORITY_ORDER[issue.priority] < PRIORITY_ORDER[best]
      ? issue.priority
      : best
  }, issues[0]!.priority)
}

export function buildComplianceClientRow(
  input: ComplianceClientInput,
  options: {
    todayKey: string
    weekStart: string
    weekEnd: string
    checkInPeriodLabel: string
    inactiveDaysThreshold?: number
  }
): ComplianceClientRow {
  const {
    todayKey,
    weekStart,
    weekEnd,
    checkInPeriodLabel,
    inactiveDaysThreshold = PROACTIVE_INACTIVE_DAYS_THRESHOLD,
  } = options

  const displayName = getFirstName(input.clientName)
  const missedWorkouts7d = countMissedWorkouts(input.workouts, todayKey)
  const sessionCompliance = countSessionCompliance(
    input.workouts,
    weekStart,
    weekEnd
  )
  const daysSinceLastSession = getDaysSinceLastSession(
    input.workouts.map((workout) => ({
      id: '',
      name: '',
      status: workout.status as 'scheduled' | 'in_progress' | 'completed' | 'skipped',
      scheduled_date: workout.scheduled_date,
      started_at: null,
      completed_at: workout.completed_at,
      updated_at: workout.completed_at ?? workout.scheduled_date,
    }))
  )

  const issues: ComplianceIssue[] = []

  if (input.pendingCheckInReviews > 0) {
    issues.push({
      kind: 'pending_check_in_review',
      priority: 'high',
      label:
        input.pendingCheckInReviews === 1
          ? 'Check-in awaiting review'
          : `${input.pendingCheckInReviews} check-ins awaiting review`,
      href: `/clients/${input.clientId}?tab=progress&section=check-ins`,
    })
  }

  if (input.pendingFormReviews > 0) {
    issues.push({
      kind: 'pending_form_review',
      priority: 'high',
      label:
        input.pendingFormReviews === 1
          ? 'Form review awaiting feedback'
          : `${input.pendingFormReviews} form reviews awaiting feedback`,
      href: '/form-review',
    })
  }

  if (input.nutritionConfigured && !input.hasNutritionLogToday) {
    issues.push({
      kind: 'missing_nutrition_log',
      priority: 'medium',
      label: 'No nutrition log today',
      href: `/clients/${input.clientId}?tab=nutrition`,
    })
  }

  if (input.nutritionConfigured && !input.hasMealPlanAssigned) {
    issues.push({
      kind: 'no_meal_plan_assigned',
      priority: 'low',
      label: 'No meal plan assigned',
      href: `/clients/${input.clientId}?tab=nutrition&section=setup`,
    })
  }

  if (input.loadContext?.hasInjuryFlag) {
    issues.push({
      kind: 'injury_flag',
      priority: 'high',
      label: 'Pain flagged in recent check-in',
      href: `/clients/${input.clientId}?tab=check-ins`,
    })
  }

  if (
    input.loadContext &&
    isAcwrLoadAlert(input.loadContext.acwrRiskLevel, input.loadContext.acwrRatio)
  ) {
    const ratio = input.loadContext.acwrRatio!.toFixed(2)
    issues.push({
      kind: 'elevated_load',
      priority:
        input.loadContext.acwrRiskLevel === 'overreaching' ? 'high' : 'medium',
      label:
        input.loadContext.acwrRiskLevel === 'overreaching'
          ? `ACWR ${ratio} — reduce load`
          : `ACWR ${ratio} — monitor load`,
      href: `/load?client=${input.clientId}`,
    })
  }

  if (missedWorkouts7d > 0) {
    issues.push({
      kind: 'missed_workout',
      priority: missedWorkouts7d >= 2 ? 'high' : 'medium',
      label:
        missedWorkouts7d === 1
          ? '1 missed workout in the last 7 days'
          : `${missedWorkouts7d} missed workouts in the last 7 days`,
      href: `/clients/${input.clientId}?tab=training&section=calendar`,
    })
  }

  if (input.unreadMessages > 0) {
    issues.push({
      kind: 'unread_message',
      priority: 'medium',
      label:
        input.unreadMessages === 1
          ? '1 unread message'
          : `${input.unreadMessages} unread messages`,
      href: `/messages?client=${input.clientId}`,
    })
  }

  if (!input.hasCheckInThisPeriod) {
    issues.push({
      kind: 'overdue_check_in',
      priority: 'medium',
      label: `No check-in ${checkInPeriodLabel}`,
      href: `/clients/${input.clientId}?tab=check-ins`,
    })
  }

  if (
    daysSinceLastSession !== null &&
    daysSinceLastSession >= inactiveDaysThreshold
  ) {
    issues.push({
      kind: 'inactive',
      priority: daysSinceLastSession >= 7 ? 'high' : 'medium',
      label: `${displayName} hasn't trained in ${daysSinceLastSession} day${
        daysSinceLastSession === 1 ? '' : 's'
      }`,
      href: `/clients/${input.clientId}?tab=training`,
    })
  }

  issues.sort(
    (left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
  )

  return {
    clientId: input.clientId,
    clientName: input.clientName,
    avatarUrl: input.avatarUrl,
    gymId: input.gymId,
    teamIds: input.teamIds,
    issues,
    issueCount: issues.length,
    highestPriority: highestIssuePriority(issues),
    missedWorkouts7d,
    sessionCompliance:
      sessionCompliance.planned > 0 ? sessionCompliance : null,
    daysSinceLastSession,
    hasCheckInThisPeriod: input.hasCheckInThisPeriod,
    pendingCheckInReviews: input.pendingCheckInReviews,
    unreadMessages: input.unreadMessages,
    pendingFormReviews: input.pendingFormReviews,
    nutritionConfigured: input.nutritionConfigured,
    hasNutritionLogToday: input.hasNutritionLogToday,
    hasMealPlanAssigned: input.hasMealPlanAssigned,
  }
}

export function buildComplianceRows(
  inputs: ComplianceClientInput[],
  options: Parameters<typeof buildComplianceClientRow>[1]
): ComplianceClientRow[] {
  return inputs.map((input) => buildComplianceClientRow(input, options))
}

export function sortComplianceRows(
  rows: ComplianceClientRow[],
  sort: ComplianceSort
): ComplianceClientRow[] {
  const sorted = [...rows]

  switch (sort) {
    case 'name':
      return sorted.sort((left, right) =>
        left.clientName.localeCompare(right.clientName)
      )
    case 'missed':
      return sorted.sort((left, right) => {
        if (right.missedWorkouts7d !== left.missedWorkouts7d) {
          return right.missedWorkouts7d - left.missedWorkouts7d
        }
        return left.clientName.localeCompare(right.clientName)
      })
    case 'inactive':
      return sorted.sort((left, right) => {
        const leftDays = left.daysSinceLastSession ?? -1
        const rightDays = right.daysSinceLastSession ?? -1
        if (rightDays !== leftDays) {
          return rightDays - leftDays
        }
        return left.clientName.localeCompare(right.clientName)
      })
    case 'issues':
    default:
      return sorted.sort((left, right) => {
        if (right.issueCount !== left.issueCount) {
          return right.issueCount - left.issueCount
        }
        const leftPriority = left.highestPriority
          ? PRIORITY_ORDER[left.highestPriority]
          : 99
        const rightPriority = right.highestPriority
          ? PRIORITY_ORDER[right.highestPriority]
          : 99
        if (leftPriority !== rightPriority) {
          return leftPriority - rightPriority
        }
        return left.clientName.localeCompare(right.clientName)
      })
  }
}

export function filterComplianceRows(
  rows: ComplianceClientRow[],
  filter: ComplianceFilter
): ComplianceClientRow[] {
  if (filter === 'needs_attention') {
    return rows.filter((row) => row.issueCount > 0)
  }
  return rows
}

export function filterComplianceRowsByScope(
  rows: ComplianceClientRow[],
  scope: AttendanceScope,
  teams: CoachTeam[]
): ComplianceClientRow[] {
  return rows.filter((row) =>
    clientMatchesAttendanceScope(
      { gymId: row.gymId ?? null, teamIds: row.teamIds ?? [] },
      scope,
      teams
    )
  )
}

export function buildComplianceSummary(
  rows: ComplianceClientRow[]
): ComplianceSummary {
  return {
    totalClients: rows.length,
    clientsNeedingAttention: rows.filter((row) => row.issueCount > 0).length,
    missedWorkouts7d: rows.reduce(
      (sum, row) => sum + row.missedWorkouts7d,
      0
    ),
    overdueCheckIns: rows.filter((row) => !row.hasCheckInThisPeriod).length,
    pendingCheckInReviews: rows.reduce(
      (sum, row) => sum + row.pendingCheckInReviews,
      0
    ),
    unreadMessages: rows.reduce((sum, row) => sum + row.unreadMessages, 0),
    pendingFormReviews: rows.reduce(
      (sum, row) => sum + row.pendingFormReviews,
      0
    ),
    missingNutritionLogs: rows.filter(
      (row) => row.nutritionConfigured && !row.hasNutritionLogToday
    ).length,
    elevatedLoadClients: rows.filter((row) =>
      row.issues.some((issue) => issue.kind === 'elevated_load')
    ).length,
    injuryFlagClients: rows.filter((row) =>
      row.issues.some((issue) => issue.kind === 'injury_flag')
    ).length,
    inactiveClients: rows.filter((row) =>
      row.issues.some((issue) => issue.kind === 'inactive')
    ).length,
  }
}

export function parseComplianceFilter(
  value: string | undefined
): ComplianceFilter {
  if (value === 'needs_attention') return 'needs_attention'
  return 'all'
}

export function parseComplianceSort(value: string | undefined): ComplianceSort {
  if (value === 'name' || value === 'missed' || value === 'inactive') {
    return value
  }
  return 'issues'
}

export function getComplianceIssueTone(
  priority: ComplianceIssue['priority']
): string {
  switch (priority) {
    case 'high':
      return 'border-l-amber-400 bg-amber-50/60 dark:bg-amber-500/5'
    case 'medium':
      return 'border-l-brand/60 bg-brand/5'
    default:
      return 'border-l-border bg-muted/30'
  }
}

export function formatSessionCompliance(
  compliance: { completed: number; planned: number } | null
): string {
  if (!compliance || compliance.planned === 0) return '—'
  return `${compliance.completed}/${compliance.planned}`
}

export function formatDaysSinceSession(days: number | null): string {
  if (days == null) return '—'
  if (days === 0) return 'Today'
  if (days === 1) return '1 day'
  return `${days} days`
}
