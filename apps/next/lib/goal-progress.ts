import { formatInbodyScanDate } from '@/lib/inbody-scans'
import type {
  ClientGoal,
  ClientInbodyScan,
  ClientGoalDirection,
  CompositionGoalMetric,
} from 'app/types/database'

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
  | 'no_change'
  | 'on_track'
  | 'off_track'

export type CompositionGoalProgress = {
  status: GoalProgressStatus
  percent: number
  change: number
  targetAmount: number
  baselineValue: number | null
  currentValue: number | null
  baselineDate: string | null
  currentDate: string | null
  detailLine: string
  hint: string | null
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

function formatSignedChange(value: number, unit: string) {
  const formatted = formatMetricValue(Math.abs(value), unit)
  if (value > 0) return `+${formatted}`
  if (value < 0) return `-${formatted}`
  return formatted
}

function directionVerb(direction: ClientGoalDirection) {
  return direction === 'decrease' ? 'lose' : 'gain'
}

function progressVerb(direction: ClientGoalDirection) {
  return direction === 'decrease' ? 'lost' : 'gained'
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
  scans: ClientInbodyScan[]
): CompositionGoalProgress {
  const targetAmount = goal.target_amount ?? 0
  const direction = goal.direction ?? 'decrease'
  const metric = goal.metric
  const unit = goal.unit ?? ''

  if (!metric || targetAmount <= 0) {
    return {
      status: 'awaiting_scan',
      percent: 0,
      change: 0,
      targetAmount,
      baselineValue: null,
      currentValue: null,
      baselineDate: null,
      currentDate: null,
      detailLine: 'Goal is not configured yet.',
      hint: null,
    }
  }

  const pair = getInbodyBaselineAndCurrent(scans)
  if (!pair) {
    return {
      status: 'awaiting_scan',
      percent: 0,
      change: 0,
      targetAmount,
      baselineValue: null,
      currentValue: null,
      baselineDate: null,
      currentDate: null,
      detailLine: 'Log an InBody scan to start tracking this goal.',
      hint: null,
    }
  }

  const baselineValue = getMetricValueFromScan(pair.baseline, metric)
  const currentValue = getMetricValueFromScan(pair.current, metric)

  if (baselineValue == null || currentValue == null) {
    return {
      status: 'awaiting_scan',
      percent: 0,
      change: 0,
      targetAmount,
      baselineValue,
      currentValue,
      baselineDate: pair.baseline.scan_date,
      currentDate: pair.current.scan_date,
      detailLine: 'Recent scans are missing this metric.',
      hint: null,
    }
  }

  const rawChange =
    direction === 'decrease'
      ? baselineValue - currentValue
      : currentValue - baselineValue

  const progressChange = Math.max(0, rawChange)
  const percent = Math.min(
    100,
    Math.round((progressChange / targetAmount) * 100)
  )

  const verb = progressVerb(direction)
  const changeLabel = formatMetricValue(progressChange, unit)
  const targetLabel = formatMetricValue(targetAmount, unit)
  const baselineLabel = formatMetricValue(baselineValue, unit)
  const baselineDateLabel = formatInbodyScanDate(pair.baseline.scan_date)

  let detailLine = `${changeLabel} of ${targetLabel} ${unit} ${verb}`
  detailLine += ` · Started at ${baselineLabel} ${unit} (${baselineDateLabel})`

  let hint: string | null = null
  let status: GoalProgressStatus = 'on_track'

  if (rawChange <= 0) {
    status = pair.baseline.id === pair.current.id ? 'no_change' : 'off_track'
    if (pair.baseline.id === pair.current.id) {
      hint = 'Only one scan logged so far.'
    } else {
      const setback = Math.abs(rawChange)
      hint = `${formatSignedChange(direction === 'decrease' ? setback : -setback, unit)} ${unit} from starting ${metric === 'weight_lbs' ? 'weight' : 'value'}.`
    }
  }

  if (percent >= 100) {
    hint = 'Goal reached!'
  }

  return {
    status,
    percent,
    change: progressChange,
    targetAmount,
    baselineValue,
    currentValue,
    baselineDate: pair.baseline.scan_date,
    currentDate: pair.current.scan_date,
    detailLine,
    hint,
  }
}

export function sortClientGoals(goals: ClientGoal[]) {
  return [...goals].sort((left, right) => {
    if (left.category !== right.category) {
      return left.category === 'daily' ? -1 : 1
    }
    return left.sort_order - right.sort_order
  })
}

export function partitionClientGoals(goals: ClientGoal[]) {
  const sorted = sortClientGoals(goals)
  return {
    dailyGoals: sorted.filter((goal) => goal.category === 'daily'),
    compositionGoals: sorted.filter((goal) => goal.category === 'composition'),
  }
}
