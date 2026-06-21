import type { TeamEventType } from 'app/types/database'

export const teamEventTypeLabels: Record<TeamEventType, string> = {
  practice: 'Practice',
  check_in: 'Check-in',
  mock_meet: 'Mock meet',
  competition: 'Competition',
  other: 'Other',
}

export const teamEventTypeBadgeVariant: Record<
  TeamEventType,
  'default' | 'secondary' | 'success' | 'warning' | 'outline'
> = {
  practice: 'secondary',
  check_in: 'outline',
  mock_meet: 'warning',
  competition: 'success',
  other: 'secondary',
}

export const teamEventTypeDotClass: Record<TeamEventType, string> = {
  practice: 'bg-blue-500',
  check_in: 'bg-violet-500',
  mock_meet: 'bg-amber-500',
  competition: 'bg-emerald-600',
  other: 'bg-muted-foreground',
}

export const teamEventRsvpLabels = {
  going: 'Going',
  maybe: 'Maybe',
  declined: 'Declined',
  no_response: 'No response',
} as const

import type { TeamEventAttendanceStatus } from 'app/types/database'

export const teamEventAttendanceLabels: Record<
  TeamEventAttendanceStatus,
  string
> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
}

export const teamEventAttendanceDotClass: Record<
  TeamEventAttendanceStatus,
  string
> = {
  present: 'bg-emerald-500',
  late: 'bg-amber-500',
  absent: 'bg-red-500',
  excused: 'bg-slate-400',
}

export const teamEventAttendanceTriggerClass: Record<
  TeamEventAttendanceStatus,
  string
> = {
  present: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  late: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  absent: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
  excused: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200',
}

export function formatTeamEventDate(dateKey: string, startTime?: string | null) {
  const dateLabel = new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (!startTime) return dateLabel

  const [hours, minutes] = startTime.split(':')
  const time = new Date()
  time.setHours(Number.parseInt(hours, 10), Number.parseInt(minutes, 10), 0)
  const timeLabel = time.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return `${dateLabel} · ${timeLabel}`
}

export function formatCompetitionDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function daysUntilDateKey(dateKey: string): number {
  const target = new Date(`${dateKey}T12:00:00`)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

export function formatCompetitionCountdown(dateKey: string, name?: string | null) {
  const days = daysUntilDateKey(dateKey)
  const label = name ? `Next meet: ${name}` : 'Next meet'
  if (days < 0) return `${label} · passed`
  if (days === 0) return `${label} · today`
  if (days === 1) return `${label} · 1 day`
  return `${label} · ${days} days`
}
