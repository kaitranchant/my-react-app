import type { TeamEventType, TeamEventAttendanceStatus } from 'app/types/database'
import { statusDotClass, statusSoftTriggerClass } from '@/lib/status-colors'

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
  present: statusDotClass.success,
  late: statusDotClass.warning,
  absent: statusDotClass.danger,
  excused: statusDotClass.neutral,
}

export const teamEventAttendanceTriggerClass: Record<
  TeamEventAttendanceStatus,
  string
> = {
  present: statusSoftTriggerClass.success,
  late: statusSoftTriggerClass.warning,
  absent: statusSoftTriggerClass.danger,
  excused: statusSoftTriggerClass.neutral,
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

export const teamChallengeStatusLabels = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
} as const

export const teamChallengeStatusBadgeVariant: Record<
  keyof typeof teamChallengeStatusLabels,
  'default' | 'secondary' | 'success' | 'warning' | 'outline'
> = {
  draft: 'outline',
  upcoming: 'secondary',
  active: 'success',
  completed: 'secondary',
  cancelled: 'outline',
}
