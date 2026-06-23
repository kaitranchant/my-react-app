import { formatInbodyScanDate } from '@/lib/inbody-scans'
import { getWeekRange } from '@/lib/coach-preferences'
import { calcWorkoutStreak } from '@/lib/client-metrics'
import {
  computeGoalPace,
  getGoalStartDateKey,
  type PaceStatus,
} from '@/lib/goal-progress-pace'
import { parseGoalMetadata } from '@/lib/goal-progress-context'
import type {
  ClientGoal,
  ClientCheckIn,
  ClientInbodyScan,
  ClientGoalDirection,
  ClientGoalHabitSource,
  ClientGoalMilestoneType,
  ClientGoalPerformanceMetric,
  CompositionGoalMetric,
  ExercisePrRecord,
} from 'app/types/database'
import type { GoalProgressOptions } from '@/lib/goal-progress-context'

export type CompositionGoalMetricConfig = {
  key: CompositionGoalMetric
  label: string
  unit: string
  defaultDirection: ClientGoalDirection
}

export const COMPOSITION_GOAL_METRICS: CompositionGoalMetricConfig[] = [
  {
    key: 'weight_lbs',
    label: 'Weight',
    unit: 'lbs',
    defaultDirection: 'decrease',
  },
  {
    key: 'percent_body_fat',
    label: 'Body fat',
    unit: '%',
    defaultDirection: 'decrease',
  },
  {
    key: 'skeletal_muscle_mass_lbs',
    label: 'Skeletal muscle mass',
    unit: 'lbs',
    defaultDirection: 'increase',
  },
  {
    key: 'body_fat_mass_lbs',
    label: 'Body fat mass',
    unit: 'lbs',
    defaultDirection: 'decrease',
  },
  {
    key: 'lean_body_mass_lbs',
    label: 'Lean body mass',
    unit: 'lbs',
    defaultDirection: 'increase',
  },
  {
    key: 'bmi',
    label: 'BMI',
    unit: 'kg/m²',
    defaultDirection: 'decrease',
  },
  {
    key: 'total_body_water_lbs',
    label: 'Total body water',
    unit: 'lbs',
    defaultDirection: 'increase',
  },
  {
    key: 'dry_lean_mass_lbs',
    label: 'Dry lean mass',
    unit: 'lbs',
    defaultDirection: 'increase',
  },
  {
    key: 'basal_metabolic_rate_kcal',
    label: 'Basal metabolic rate',
    unit: 'kcal',
    defaultDirection: 'increase',
  },
  {
    key: 'skeletal_muscle_index',
    label: 'Skeletal muscle index',
    unit: 'kg/m²',
    defaultDirection: 'increase',
  },
]

export type InbodyBaselineCurrent = {
  baseline: ClientInbodyScan
  current: ClientInbodyScan
}

export type GoalProgressStatus =
  | 'awaiting_scan'
  | 'awaiting_data'
  | 'no_change'
  | 'on_track'
  | 'off_track'
  | 'complete'
  | 'behind'
  | 'ahead'

export type GoalProgressBase = {
  status: GoalProgressStatus
  percent: number
  detailLine: string
  hint: string | null
  paceStatus: PaceStatus | null
  estimatedCompletionLabel: string | null
}

export type CompositionGoalProgress = GoalProgressBase & {
  change: number
  targetAmount: number
  baselineValue: number | null
  currentValue: number | null
  baselineDate: string | null
  currentDate: string | null
}

export type PerformanceGoalProgress = GoalProgressBase & {
  currentValue: number | null
  targetValue: number
}

export type HabitGoalProgress = GoalProgressBase & {
  currentCount: number
  targetCount: number
  periodLabel: string
}

export type MilestoneGoalProgress = GoalProgressBase & {
  currentCount: number
  targetCount: number
}

export function getCompositionMetricConfig(metric: CompositionGoalMetric) {
  return COMPOSITION_GOAL_METRICS.find((row) => row.key === metric)
}

export function resolveCompositionGoalTitle(
  metric: CompositionGoalMetric,
  customTitle: string | null | undefined
): string {
  const trimmed = customTitle?.trim()
  if (trimmed) return trimmed
  return getCompositionMetricConfig(metric)?.label ?? metric
}

export function getMetricValueFromScan(
  scan: ClientInbodyScan,
  metric: CompositionGoalMetric
): number | null {
  switch (metric) {
    case 'weight_lbs':
      return scan.weight_lbs
    case 'percent_body_fat':
      return scan.percent_body_fat
    case 'skeletal_muscle_mass_lbs':
      return scan.skeletal_muscle_mass_lbs
    case 'body_fat_mass_lbs':
      return scan.body_fat_mass_lbs
    case 'lean_body_mass_lbs':
      return scan.lean_body_mass_lbs
    case 'bmi':
      return scan.bmi
    case 'total_body_water_lbs':
      return scan.total_body_water_lbs
    case 'dry_lean_mass_lbs':
      return scan.dry_lean_mass_lbs
    case 'basal_metabolic_rate_kcal':
      return scan.basal_metabolic_rate_kcal
    case 'skeletal_muscle_index':
      return scan.skeletal_muscle_index
    default:
      return null
  }
}

export function getInbodyBaselineAndCurrent(
  scans: ClientInbodyScan[]
): InbodyBaselineCurrent | null {
  if (scans.length === 0) return null

  const sorted = [...scans].sort(
    (left, right) =>
      new Date(left.scan_date).getTime() - new Date(right.scan_date).getTime()
  )

  return {
    baseline: sorted[0]!,
    current: sorted[sorted.length - 1]!,
  }
}

function formatMetricValue(value: number, unit: string) {
  if (unit === 'kcal') return Math.round(value).toString()
  if (unit === 'steps') return Math.round(value).toString()
  if (unit === '%') return value.toFixed(1)
  if (unit === 'kg/m²') return value.toFixed(1)
  return value.toFixed(1)
}

function formatChangeAmount(value: number, unit: string) {
  const formatted = formatMetricValue(Math.abs(value), unit)
  if (unit === '%') return `${formatted}%`
  if (unit === 'kcal') return `${formatted} calories`
  return `${formatted} ${unit}`
}

function buildCompositionSetbackHint(
  metric: CompositionGoalMetric,
  direction: ClientGoalDirection,
  setback: number,
  unit: string
): string {
  const amount = formatChangeAmount(setback, unit)
  const metricLabel =
    getCompositionMetricConfig(metric)?.label.toLowerCase() ?? 'value'

  if (direction === 'decrease') {
    switch (metric) {
      case 'percent_body_fat':
        return `Body fat has increased ${amount} since starting.`
      case 'weight_lbs':
        return `Weight has increased ${amount} since starting.`
      case 'body_fat_mass_lbs':
        return `Body fat mass has increased ${amount} since starting.`
      case 'bmi':
        return `BMI has increased ${amount} since starting.`
      default:
        return `${metricLabel.charAt(0).toUpperCase()}${metricLabel.slice(1)} has increased ${amount} since starting.`
    }
  }

  switch (metric) {
    case 'skeletal_muscle_mass_lbs':
      return `Muscle mass has decreased ${amount} since starting.`
    case 'lean_body_mass_lbs':
      return `Lean body mass has decreased ${amount} since starting.`
    case 'dry_lean_mass_lbs':
      return `Dry lean mass has decreased ${amount} since starting.`
    case 'total_body_water_lbs':
      return `Total body water has decreased ${amount} since starting.`
    case 'basal_metabolic_rate_kcal':
      return `Basal metabolic rate has decreased ${amount} since starting.`
    case 'skeletal_muscle_index':
      return `Skeletal muscle index has decreased ${amount} since starting.`
    default:
      return `${metricLabel.charAt(0).toUpperCase()}${metricLabel.slice(1)} has decreased ${amount} since starting.`
  }
}

function directionVerb(direction: ClientGoalDirection) {
  return direction === 'decrease' ? 'lose' : 'gain'
}

function getCheckInBaselineAndCurrent(
  checkIns: ClientCheckIn[]
): { baseline: ClientCheckIn; current: ClientCheckIn } | null {
  const withWeight = checkIns.filter((row) => row.weight != null)
  if (withWeight.length === 0) return null

  const sorted = [...withWeight].sort(
    (left, right) =>
      new Date(left.check_in_date).getTime() -
      new Date(right.check_in_date).getTime()
  )

  return {
    baseline: sorted[0]!,
    current: sorted[sorted.length - 1]!,
  }
}

function applyPaceToProgress<T extends GoalProgressBase>(
  progress: T,
  goal: ClientGoal,
  currentMetricValue: number | null,
  targetMetricValue: number | null
): T {
  const pace = computeGoalPace(
    progress.percent,
    getGoalStartDateKey(goal.created_at),
    goal.target_date,
    currentMetricValue ?? undefined,
    targetMetricValue ?? undefined
  )

  let status = progress.status
  let hint = progress.hint
  if (pace.paceStatus === 'behind' && status === 'on_track') {
    status = 'behind'
  } else if (pace.paceStatus === 'ahead' && status === 'on_track') {
    status = 'ahead'
  }

  if (status === 'behind' && !hint) {
    hint = 'Slightly behind — consistent training will get you there.'
  }

  return {
    ...progress,
    status,
    hint,
    paceStatus: pace.paceStatus,
    estimatedCompletionLabel:
      pace.estimatedCompletionLabel ?? progress.estimatedCompletionLabel,
  }
}

function emptyCompositionProgress(
  overrides: Partial<CompositionGoalProgress>
): CompositionGoalProgress {
  return {
    status: 'awaiting_scan',
    percent: 0,
    change: 0,
    targetAmount: 0,
    baselineValue: null,
    currentValue: null,
    baselineDate: null,
    currentDate: null,
    detailLine: '',
    hint: null,
    paceStatus: null,
    estimatedCompletionLabel: null,
    ...overrides,
  }
}

export function formatCompositionGoalLabel(goal: ClientGoal): string {
  if (goal.title?.trim()) return goal.title.trim()
  if (goal.category !== 'composition' || !goal.metric || !goal.direction) {
    return 'Goal'
  }

  const config = getCompositionMetricConfig(goal.metric)
  const amount = goal.target_amount ?? 0
  const unit = goal.unit ?? config?.unit ?? ''
  const verb = directionVerb(goal.direction)
  const metricLabel = config?.label.toLowerCase() ?? goal.metric

  if (goal.metric === 'weight_lbs') {
    return `${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${formatMetricValue(amount, unit)} ${unit}`
  }

  if (goal.metric === 'percent_body_fat') {
    return `${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${formatMetricValue(amount, unit)}${unit} body fat`
  }

  if (goal.metric === 'skeletal_muscle_mass_lbs') {
    return `${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${formatMetricValue(amount, unit)} ${unit} muscle`
  }

  return `${verb.charAt(0).toUpperCase()}${verb.slice(1)} ${formatMetricValue(amount, unit)} ${unit} ${metricLabel}`
}

export function formatGoalTargetDateLabel(
  targetDate: string | null | undefined
): string | null {
  if (!targetDate?.trim()) return null

  return new Date(`${targetDate.trim()}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatCompactGoalDueDate(
  targetDate: string | null | undefined
): string | null {
  if (!targetDate?.trim()) return null

  return new Date(`${targetDate.trim()}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatCompactGoalDetailLine(
  detailLine: string,
  targetDate: string | null | undefined
): string {
  const progressPart =
    detailLine.split(' · Started at')[0]?.trim() ?? detailLine.trim()
  const simplified = progressPart.replace(/(\d+)\.0(?=\s|$)/g, '$1')
  const due = formatCompactGoalDueDate(targetDate)
  return due ? `${simplified} · Due ${due}` : simplified
}

export function getGoalProgressBarClassName(
  status: GoalProgressStatus
): string | undefined {
  switch (status) {
    case 'behind':
      return 'bg-status-warning'
    case 'off_track':
    case 'on_track':
    case 'ahead':
    case 'complete':
      return 'bg-brand'
    default:
      return undefined
  }
}

export function getDailyTargetCheckInHint(
  goal: ClientGoal,
  checkIns: ClientCheckIn[]
): string | null {
  if (goal.category !== 'daily' || goal.target_value == null) return null

  const title = goal.title?.trim().toLowerCase() ?? ''
  const isSleepTarget =
    title === 'sleep' || (title.includes('sleep') && goal.unit === 'hours')

  if (!isSleepTarget) return null

  const latestWithSleep = [...checkIns]
    .sort(
      (left, right) =>
        new Date(right.check_in_date).getTime() -
        new Date(left.check_in_date).getTime()
    )
    .find((row) => row.sleep_hours != null)

  if (latestWithSleep?.sleep_hours == null) return null

  const loggedValue = latestWithSleep.sleep_hours!
  const dateLabel = new Date(latestWithSleep.check_in_date).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
    }
  )
  const met =
    goal.comparison === 'at_least'
      ? loggedValue >= goal.target_value
      : loggedValue <= goal.target_value

  return `Last logged: ${loggedValue} hrs (${dateLabel}) · ${met ? 'On target' : 'Below target'}`
}

export function formatDailyTargetLabel(goal: ClientGoal): string {
  if (goal.category !== 'daily' || goal.target_value == null || !goal.unit) {
    return goal.title?.trim() || 'Daily target'
  }

  const value = formatMetricValue(goal.target_value, goal.unit)
  const unit = goal.unit === 'kcal' ? 'calories' : goal.unit
  const title = goal.title?.trim()

  if (goal.comparison === 'at_least') {
    return title
      ? `${title}: at least ${value} ${unit}`
      : `At least ${value} ${unit}`
  }

  return title
    ? `${title}: under ${value} ${unit}`
    : `Under ${value} ${unit}`
}

export function computeCompositionProgress(
  goal: ClientGoal,
  scans: ClientInbodyScan[],
  checkIns: ClientCheckIn[] = [],
  options?: GoalProgressOptions
): CompositionGoalProgress {
  void options
  const targetAmount = goal.target_amount ?? 0
  const direction = goal.direction ?? 'decrease'
  const metric = goal.metric
  const unit = goal.unit ?? ''
  const progressSource = goal.progress_source ?? 'prefer_inbody'

  if (!metric || targetAmount <= 0) {
    return emptyCompositionProgress({
      targetAmount,
      detailLine: 'Goal is not configured yet.',
    })
  }

  const useCheckIns =
    progressSource === 'check_in' ||
    (progressSource === 'prefer_inbody' &&
      metric === 'weight_lbs' &&
      scans.length === 0 &&
      checkIns.some((row) => row.weight != null))

  if (useCheckIns && metric === 'weight_lbs') {
    const pair = getCheckInBaselineAndCurrent(checkIns)
    if (!pair) {
      return emptyCompositionProgress({
        targetAmount,
        detailLine: 'Log a check-in with weight to start tracking this goal.',
      })
    }

    const baselineValue = pair.baseline.weight!
    const currentValue = pair.current.weight!
    return buildCompositionProgressFromValues({
      goal,
      direction,
      targetAmount,
      unit,
      metric,
      baselineValue,
      currentValue,
      baselineDate: pair.baseline.check_in_date,
      currentDate: pair.current.check_in_date,
      baselineLabelPrefix: 'check-in',
    })
  }

  const pair = getInbodyBaselineAndCurrent(scans)
  if (!pair) {
    return emptyCompositionProgress({
      targetAmount,
      detailLine: 'Log an InBody scan to start tracking this goal.',
    })
  }

  const baselineValue = getMetricValueFromScan(pair.baseline, metric)
  const currentValue = getMetricValueFromScan(pair.current, metric)

  if (baselineValue == null || currentValue == null) {
    return emptyCompositionProgress({
      targetAmount,
      baselineValue,
      currentValue,
      baselineDate: pair.baseline.scan_date,
      currentDate: pair.current.scan_date,
      detailLine: 'Recent scans are missing this metric.',
    })
  }

  return buildCompositionProgressFromValues({
    goal,
    direction,
    targetAmount,
    unit,
    metric,
    baselineValue,
    currentValue,
    baselineDate: pair.baseline.scan_date,
    currentDate: pair.current.scan_date,
    baselineLabelPrefix: 'scan',
  })
}

function buildCompositionProgressFromValues(params: {
  goal: ClientGoal
  direction: ClientGoalDirection
  targetAmount: number
  unit: string
  metric: CompositionGoalMetric
  baselineValue: number
  currentValue: number
  baselineDate: string
  currentDate: string
  baselineLabelPrefix: string
}): CompositionGoalProgress {
  const {
    goal,
    direction,
    targetAmount,
    unit,
    metric,
    baselineValue,
    currentValue,
    baselineDate,
    baselineLabelPrefix,
  } = params

  const rawChange =
    direction === 'decrease'
      ? baselineValue - currentValue
      : currentValue - baselineValue

  const progressChange = Math.max(0, rawChange)
  const percent = Math.min(
    100,
    Math.round((progressChange / targetAmount) * 100)
  )

  const verb = direction === 'decrease' ? 'lost' : 'gained'
  const changeLabel = formatMetricValue(progressChange, unit)
  const targetLabel = formatMetricValue(targetAmount, unit)
  const baselineLabel = formatMetricValue(baselineValue, unit)
  const baselineDateLabel =
    baselineLabelPrefix === 'scan'
      ? formatInbodyScanDate(baselineDate)
      : new Date(baselineDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })

  let detailLine = `${changeLabel} of ${targetLabel} ${unit} ${verb}`
  detailLine += ` · Started at ${baselineLabel} ${unit} (${baselineDateLabel})`

  let hint: string | null = null
  let status: GoalProgressStatus = 'on_track'

  if (rawChange <= 0) {
    status =
      baselineDate === params.currentDate ? 'no_change' : 'off_track'
    if (baselineDate === params.currentDate) {
      hint = 'Only one measurement logged so far.'
    } else {
      const setback = Math.abs(rawChange)
      hint = buildCompositionSetbackHint(metric, direction, setback, unit)
    }
  }

  if (percent >= 100) {
    status = 'complete'
    hint = 'Goal reached!'
  }

  const base = emptyCompositionProgress({
    status,
    percent,
    change: progressChange,
    targetAmount,
    baselineValue,
    currentValue,
    baselineDate,
    currentDate: params.currentDate,
    detailLine,
    hint,
  })

  const targetMetricValue =
    direction === 'decrease'
      ? baselineValue - targetAmount
      : baselineValue + targetAmount

  return applyPaceToProgress(base, goal, currentValue, targetMetricValue)
}

function getBestPrValue(
  records: ExercisePrRecord[],
  exerciseId: string,
  metric: ClientGoalPerformanceMetric,
  bestDurationByExerciseId: Record<string, number> = {}
): number | null {
  if (metric === 'time_seconds') {
    return bestDurationByExerciseId[exerciseId] ?? null
  }

  const exerciseRecords = records.filter((row) => row.exercise_id === exerciseId)
  if (exerciseRecords.length === 0) return null

  const values = exerciseRecords
    .map((row) => {
      if (metric === 'weight') return row.weight
      if (metric === 'reps') return row.reps
      if (metric === 'e1rm') return row.e1rm
      return null
    })
    .filter((value): value is number => value != null)

  if (values.length === 0) return null
  return Math.max(...values)
}

function getPowerliftingTotal(
  records: ExercisePrRecord[],
  metadata: ReturnType<typeof parseGoalMetadata>,
  bestDurationByExerciseId: Record<string, number> = {}
): number | null {
  const squat = metadata.squatExerciseId
    ? getBestPrValue(records, metadata.squatExerciseId, 'weight', bestDurationByExerciseId)
    : null
  const bench = metadata.benchExerciseId
    ? getBestPrValue(records, metadata.benchExerciseId, 'weight', bestDurationByExerciseId)
    : null
  const deadlift = metadata.deadliftExerciseId
    ? getBestPrValue(records, metadata.deadliftExerciseId, 'weight', bestDurationByExerciseId)
    : null

  if (squat == null || bench == null || deadlift == null) return null
  return squat + bench + deadlift
}

export function formatPerformanceGoalLabel(
  goal: ClientGoal,
  exerciseName?: string | null
): string {
  if (goal.title?.trim()) return goal.title.trim()

  const target = goal.target_value ?? 0
  const unit = goal.unit ?? 'lbs'
  const comparison = goal.comparison === 'at_most' ? 'under' : 'at least'

  if (goal.performance_metric === 'powerlifting_total') {
    return `Powerlifting total: ${comparison} ${formatMetricValue(target, unit)} ${unit}`
  }

  const metricLabel =
    goal.performance_metric === 'e1rm'
      ? 'e1RM'
      : goal.performance_metric === 'time_seconds'
        ? 'time'
        : goal.performance_metric ?? 'lift'

  const name = exerciseName ?? 'Lift'
  return `${name}: ${comparison} ${formatMetricValue(target, unit)} ${unit} ${metricLabel}`
}

export function computePerformanceProgress(
  goal: ClientGoal,
  prRecords: ExercisePrRecord[],
  bestDurationByExerciseId: Record<string, number> = {}
): PerformanceGoalProgress {
  const targetValue = goal.target_value ?? 0
  const comparison = goal.comparison ?? 'at_least'
  const unit = goal.unit ?? 'lbs'

  if (!goal.performance_metric || targetValue <= 0) {
    return {
      status: 'awaiting_data',
      percent: 0,
      currentValue: null,
      targetValue,
      detailLine: 'Goal is not configured yet.',
      hint: null,
      paceStatus: null,
      estimatedCompletionLabel: null,
    }
  }

  const currentValue =
    goal.performance_metric === 'powerlifting_total'
      ? getPowerliftingTotal(
          prRecords,
          parseGoalMetadata(goal.metadata),
          bestDurationByExerciseId
        )
      : goal.exercise_id
        ? getBestPrValue(
            prRecords,
            goal.exercise_id,
            goal.performance_metric,
            bestDurationByExerciseId
          )
        : null

  if (currentValue == null) {
    return {
      status: 'awaiting_data',
      percent: 0,
      currentValue: null,
      targetValue,
      detailLine:
        goal.performance_metric === 'time_seconds'
          ? 'Log a workout duration to start tracking this goal.'
          : 'Log a workout PR to start tracking this goal.',
      hint: null,
      paceStatus: null,
      estimatedCompletionLabel: null,
    }
  }

  const meetsTarget =
    comparison === 'at_least'
      ? currentValue >= targetValue
      : currentValue <= targetValue

  const percent = meetsTarget
    ? 100
    : goal.performance_metric === 'time_seconds' &&
        goal.comparison === 'at_most' &&
        currentValue > 0
      ? Math.min(99, Math.round((targetValue / currentValue) * 100))
      : Math.min(99, Math.round((currentValue / targetValue) * 100))

  const currentLabel = formatMetricValue(currentValue, unit)
  const targetLabel = formatMetricValue(targetValue, unit)
  const detailLine = `${currentLabel} of ${targetLabel} ${unit}`

  let status: GoalProgressStatus = meetsTarget ? 'complete' : 'on_track'
  let hint: string | null = meetsTarget ? 'Goal reached!' : null

  if (!meetsTarget && comparison === 'at_least' && currentValue < targetValue) {
    const remaining = targetValue - currentValue
    hint = `${formatMetricValue(remaining, unit)} ${unit} to go.`
  }

  const base: PerformanceGoalProgress = {
    status,
    percent,
    currentValue,
    targetValue,
    detailLine,
    hint,
    paceStatus: null,
    estimatedCompletionLabel: null,
  }

  return applyPaceToProgress(base, goal, currentValue, targetValue)
}

export const HABIT_SOURCE_LABELS: Record<ClientGoalHabitSource, string> = {
  workouts_per_week: 'Workouts per week',
  check_in_submitted: 'Check-ins per week',
  nutrition_adherence: 'Nutrition adherence',
}

export function formatHabitGoalLabel(goal: ClientGoal): string {
  if (goal.title?.trim()) return goal.title.trim()

  const source = goal.habit_source
  if (!source) return 'Habit goal'

  if (source === 'nutrition_adherence') {
    return `Nutrition adherence: at least ${goal.target_value ?? 0}/10 avg`
  }

  const frequency = goal.habit_frequency ?? 0
  if (source === 'workouts_per_week') {
    return `Train at least ${frequency} time${frequency === 1 ? '' : 's'} per week`
  }

  return `Submit at least ${frequency} check-in${frequency === 1 ? '' : 's'} per week`
}

function countWorkoutsInWeek(
  workouts: Pick<
    import('app/types/database').ClientScheduledWorkout,
    'status' | 'scheduled_date'
  >[],
  weekStart: string,
  weekEnd: string
) {
  return workouts.filter(
    (row) =>
      row.status === 'completed' &&
      row.scheduled_date >= weekStart &&
      row.scheduled_date <= weekEnd
  ).length
}

function countCheckInsInWeek(checkIns: ClientCheckIn[], weekStart: string, weekEnd: string) {
  return checkIns.filter(
    (row) => row.check_in_date >= weekStart && row.check_in_date <= weekEnd
  ).length
}

function averageNutritionAdherenceInWeek(
  checkIns: ClientCheckIn[],
  weekStart: string,
  weekEnd: string
) {
  const values = checkIns
    .filter(
      (row) =>
        row.check_in_date >= weekStart &&
        row.check_in_date <= weekEnd &&
        row.nutrition_adherence != null
    )
    .map((row) => row.nutrition_adherence!)

  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function computeHabitProgress(
  goal: ClientGoal,
  workouts: Pick<
    import('app/types/database').ClientScheduledWorkout,
    'status' | 'scheduled_date'
  >[],
  checkIns: ClientCheckIn[],
  options?: GoalProgressOptions
): HabitGoalProgress {
  const weekRange = getWeekRange(
    options?.weekStartsOn ?? 'monday',
    options?.timezone ?? 'auto'
  )
  const source = goal.habit_source
  const targetCount =
    source === 'nutrition_adherence'
      ? Number(goal.target_value ?? 0)
      : Number(goal.habit_frequency ?? 0)

  if (!source || targetCount <= 0) {
    return {
      status: 'awaiting_data',
      percent: 0,
      currentCount: 0,
      targetCount,
      periodLabel: 'this week',
      detailLine: 'Goal is not configured yet.',
      hint: null,
      paceStatus: null,
      estimatedCompletionLabel: null,
    }
  }

  let currentCount = 0
  let detailLine = ''
  let percent = 0
  let status: GoalProgressStatus = 'on_track'
  let hint: string | null = null

  if (source === 'workouts_per_week') {
    currentCount = countWorkoutsInWeek(
      workouts,
      weekRange.start,
      weekRange.end
    )
    detailLine = `${currentCount} of ${targetCount} workouts this week`
  } else if (source === 'check_in_submitted') {
    currentCount = countCheckInsInWeek(
      checkIns,
      weekRange.start,
      weekRange.end
    )
    detailLine = `${currentCount} of ${targetCount} check-in${targetCount === 1 ? '' : 's'} this week`
  } else {
    const average = averageNutritionAdherenceInWeek(
      checkIns,
      weekRange.start,
      weekRange.end
    )
    currentCount = average != null ? Math.round(average * 10) / 10 : 0
    detailLine =
      average != null
        ? `${currentCount.toFixed(1)} avg adherence this week (target ${targetCount}/10)`
        : 'No check-in adherence logged this week'
    percent =
      average != null
        ? Math.min(100, Math.round((average / targetCount) * 100))
        : 0
  }

  if (source !== 'nutrition_adherence') {
    percent = Math.min(100, Math.round((currentCount / targetCount) * 100))
  }

  if (percent >= 100) {
    status = 'complete'
    hint = 'Target met this week!'
  } else {
    const today = new Date()
    const weekStart = new Date(`${weekRange.start}T12:00:00`)
    const weekEnd = new Date(`${weekRange.end}T12:00:00`)
    const weekMidpoint = new Date(
      weekStart.getTime() + (weekEnd.getTime() - weekStart.getTime()) / 2
    )

    if (today > weekMidpoint && percent < 50) {
      status = 'behind'
      hint = 'Behind pace for this week.'
    }
  }

  const base: HabitGoalProgress = {
    status,
    percent,
    currentCount,
    targetCount,
    periodLabel: 'this week',
    detailLine,
    hint,
    paceStatus: null,
    estimatedCompletionLabel: null,
  }

  return applyPaceToProgress(
    base,
    goal,
    source === 'nutrition_adherence' ? currentCount : currentCount,
    targetCount
  )
}

export const MILESTONE_TYPE_LABELS: Record<ClientGoalMilestoneType, string> = {
  session_count: 'Session count',
  program_completion: 'Program completion',
  training_streak_days: 'Training streak',
}

export function formatMilestoneGoalLabel(goal: ClientGoal): string {
  if (goal.title?.trim()) return goal.title.trim()

  const target = goal.milestone_target_count ?? 0
  const type = goal.milestone_type

  if (type === 'session_count') {
    return `Complete ${target} session${target === 1 ? '' : 's'}`
  }
  if (type === 'program_completion') {
    return `Complete program (${target}% of sessions)`
  }
  return `Reach a ${target}-day training streak`
}

function countCompletedSessionsSince(
  workouts: Pick<
    import('app/types/database').ClientScheduledWorkout,
    'status' | 'scheduled_date' | 'completed_at'
  >[],
  sinceDateKey: string
) {
  return workouts.filter(
    (row) =>
      row.status === 'completed' &&
      row.scheduled_date >= sinceDateKey.slice(0, 10)
  ).length
}

export function computeMilestoneProgress(
  goal: ClientGoal,
  workouts: Pick<
    import('app/types/database').ClientScheduledWorkout,
    'status' | 'scheduled_date' | 'completed_at'
  >[],
  programDayOffsets: number[] = [],
  assignmentStartDate: string | null = null
): MilestoneGoalProgress {
  const targetCount = goal.milestone_target_count ?? 0
  const type = goal.milestone_type

  if (!type || targetCount <= 0) {
    return {
      status: 'awaiting_data',
      percent: 0,
      currentCount: 0,
      targetCount,
      detailLine: 'Goal is not configured yet.',
      hint: null,
      paceStatus: null,
      estimatedCompletionLabel: null,
    }
  }

  let currentCount = 0
  let detailLine = ''
  let percent = 0

  if (type === 'session_count') {
    currentCount = countCompletedSessionsSince(workouts, goal.created_at)
    percent = Math.min(100, Math.round((currentCount / targetCount) * 100))
    detailLine = `${currentCount} of ${targetCount} sessions completed`
  } else if (type === 'training_streak_days') {
    currentCount = calcWorkoutStreak(workouts)
    percent = Math.min(100, Math.round((currentCount / targetCount) * 100))
    detailLine = `${currentCount} of ${targetCount} day streak`
  } else {
    const totalScheduled = programDayOffsets.length
    if (totalScheduled === 0 || !assignmentStartDate) {
      return {
        status: 'awaiting_data',
        percent: 0,
        currentCount: 0,
        targetCount,
        detailLine: 'Assign the linked program to track completion.',
        hint: null,
        paceStatus: null,
        estimatedCompletionLabel: null,
      }
    }

    const completed = countCompletedSessionsSince(workouts, assignmentStartDate)
    currentCount = completed
    const rawPercent = Math.round((completed / totalScheduled) * 100)
    percent = Math.min(100, rawPercent)
    detailLine = `${completed} of ${totalScheduled} program sessions completed`
  }

  let status: GoalProgressStatus =
    percent >= 100 ? 'complete' : percent > 0 ? 'on_track' : 'awaiting_data'
  let hint: string | null = percent >= 100 ? 'Milestone reached!' : null

  const base: MilestoneGoalProgress = {
    status,
    percent,
    currentCount,
    targetCount,
    detailLine,
    hint,
    paceStatus: null,
    estimatedCompletionLabel: null,
  }

  return applyPaceToProgress(base, goal, currentCount, targetCount)
}

export function getGoalStatusLabel(status: GoalProgressStatus): string {
  switch (status) {
    case 'awaiting_scan':
      return 'Awaiting scan'
    case 'awaiting_data':
      return 'Awaiting data'
    case 'no_change':
      return 'No change yet'
    case 'on_track':
      return 'On track'
    case 'off_track':
      return 'Needs focus'
    case 'behind':
      return 'Behind pace'
    case 'ahead':
      return 'Ahead'
    case 'complete':
      return 'Complete'
    default:
      return status
  }
}

export function isNegativeGoalStatus(status: GoalProgressStatus) {
  return status === 'off_track' || status === 'behind'
}

export function sortClientGoals(goals: ClientGoal[]) {
  const categoryOrder: Record<ClientGoal['category'], number> = {
    daily: 0,
    habit: 1,
    performance: 2,
    composition: 3,
    milestone: 4,
  }

  return [...goals].sort((left, right) => {
    if (left.category !== right.category) {
      return categoryOrder[left.category] - categoryOrder[right.category]
    }
    return left.sort_order - right.sort_order
  })
}

export function partitionClientGoals(goals: ClientGoal[]) {
  const sorted = sortClientGoals(goals)
  return {
    dailyGoals: sorted.filter((goal) => goal.category === 'daily'),
    compositionGoals: sorted.filter((goal) => goal.category === 'composition'),
    performanceGoals: sorted.filter((goal) => goal.category === 'performance'),
    habitGoals: sorted.filter((goal) => goal.category === 'habit'),
    milestoneGoals: sorted.filter((goal) => goal.category === 'milestone'),
  }
}
