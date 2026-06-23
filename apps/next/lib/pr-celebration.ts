import { weightUnitLabel } from '@/lib/coach-preferences'
import { formatPrLabel } from '@/lib/load-analytics'
import type { NewPrSummary } from '@/lib/pr-records'
import type { WeightUnit } from 'app/types/database'

export function formatPrAchievementLabel(
  pr: NewPrSummary,
  weightUnit: WeightUnit = 'lbs'
): string {
  if (pr.recordType === 'e1rm' && pr.e1rm != null) {
    return `${pr.e1rm} ${weightUnitLabel(weightUnit)} e1RM`
  }

  return formatPrLabel(pr.recordType, pr.e1rm, pr.weight, pr.reps)
}

export function buildPrCelebrationHeadline(prCount: number): string {
  if (prCount <= 1) {
    return 'New Personal Record!'
  }

  return `${prCount} New Personal Records!`
}

export function buildPrShareText({
  prs,
  workoutName,
  athleteName,
  weightUnit = 'lbs',
}: {
  prs: NewPrSummary[]
  workoutName: string
  athleteName?: string
  weightUnit?: WeightUnit
}): string {
  const header = athleteName
    ? `${athleteName} hit a new PR!`
    : 'New personal record!'

  return [
    header,
    workoutName,
    '',
    ...prs.map(
      (pr) =>
        `🏆 ${pr.exerciseName} — ${formatPrAchievementLabel(pr, weightUnit)}`
    ),
  ].join('\n')
}
