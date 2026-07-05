import { coachingSessionTypeLabels } from '@/lib/coaching-session-types'

const exportedSummaryPrefixes = [
  'Coaching session —',
  ...Object.values(coachingSessionTypeLabels).map((label) => `${label} —`),
]

export function isExportedCoachingCalendarSummary(summary: string | undefined) {
  if (!summary?.trim()) return false
  const normalized = summary.trim()
  return exportedSummaryPrefixes.some((prefix) => normalized.startsWith(prefix))
}
