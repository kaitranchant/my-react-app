export type PaceStatus = 'ahead' | 'on_track' | 'behind'

export type PaceResult = {
  paceStatus: PaceStatus | null
  estimatedCompletionDate: string | null
  estimatedCompletionLabel: string | null
}

const PACE_BUFFER_PERCENT = 5

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`)
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatEstimatedDate(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export function computeGoalPace(
  actualPercent: number,
  startDateKey: string | null | undefined,
  targetDateKey: string | null | undefined,
  currentValue?: number,
  targetValue?: number
): PaceResult {
  if (!startDateKey || !targetDateKey) {
    return {
      paceStatus: null,
      estimatedCompletionDate: null,
      estimatedCompletionLabel: null,
    }
  }

  const start = parseDateKey(startDateKey)
  const target = parseDateKey(targetDateKey)
  const today = parseDateKey(toDateKey(new Date()))

  const totalDays = Math.max(
    1,
    Math.round((target.getTime() - start.getTime()) / 86_400_000)
  )
  const elapsedDays = Math.max(
    0,
    Math.min(
      totalDays,
      Math.round((today.getTime() - start.getTime()) / 86_400_000)
    )
  )

  const expectedPercent = Math.min(
    100,
    Math.round((elapsedDays / totalDays) * 100)
  )

  let paceStatus: PaceStatus = 'on_track'
  if (actualPercent > expectedPercent + PACE_BUFFER_PERCENT) {
    paceStatus = 'ahead'
  } else if (actualPercent < expectedPercent - PACE_BUFFER_PERCENT) {
    paceStatus = 'behind'
  }

  let estimatedCompletionDate: string | null = null
  let estimatedCompletionLabel: string | null = null

  if (
    actualPercent > 0 &&
    actualPercent < 100 &&
    elapsedDays > 0
  ) {
    const progressPerDay = actualPercent / elapsedDays
    if (progressPerDay > 0) {
      const daysRemaining = Math.ceil((100 - actualPercent) / progressPerDay)
      const estimated = new Date(today)
      estimated.setDate(estimated.getDate() + daysRemaining)
      estimatedCompletionDate = toDateKey(estimated)
      estimatedCompletionLabel = `At this pace you'll hit your goal by ${formatEstimatedDate(estimatedCompletionDate)}.`
    }
  } else if (actualPercent >= 100) {
    estimatedCompletionLabel = 'Goal reached!'
  }

  return {
    paceStatus,
    estimatedCompletionDate,
    estimatedCompletionLabel,
  }
}

export function getGoalStartDateKey(goalCreatedAt: string) {
  return goalCreatedAt.slice(0, 10)
}
