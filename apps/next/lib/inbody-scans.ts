import type {
  ClientInbodyScan,
  ClientInbodyScanInsert,
  ClientInbodyScanUpdate,
  CheckInSubmittedBy,
} from 'app/types/database'
import type { InbodyScanFormValues } from '@/lib/validations/inbody-scan'

export type InbodyChartPoint = {
  scanDate: string
  label: string
  weight: number
  skeletalMuscleMass: number
  percentBodyFat: number
  totalBodyWater: number | null
  dryLeanMass: number | null
  bodyFatMass: number | null
  bmi: number | null
  leanBodyMass: number | null
  basalMetabolicRate: number | null
  skeletalMuscleIndex: number | null
}

export type InbodyChartMetricKey = keyof Omit<
  InbodyChartPoint,
  'scanDate' | 'label'
>

export type InbodyChartMetric = {
  key: InbodyChartMetricKey
  label: string
  unit: string
  color: string
  required: boolean
  formatValue: (value: number) => string
}

export const INBODY_CHART_METRICS: InbodyChartMetric[] = [
  {
    key: 'weight',
    label: 'Weight',
    unit: 'lbs',
    color: 'stroke-brand',
    required: true,
    formatValue: (value) => value.toFixed(1),
  },
  {
    key: 'skeletalMuscleMass',
    label: 'Skeletal muscle mass',
    unit: 'lbs',
    color: 'stroke-emerald-600',
    required: true,
    formatValue: (value) => value.toFixed(1),
  },
  {
    key: 'percentBodyFat',
    label: 'Percent body fat',
    unit: '%',
    color: 'stroke-amber-600',
    required: true,
    formatValue: (value) => value.toFixed(1),
  },
  {
    key: 'totalBodyWater',
    label: 'Total body water',
    unit: 'lbs',
    color: 'stroke-sky-600',
    required: false,
    formatValue: (value) => value.toFixed(1),
  },
  {
    key: 'dryLeanMass',
    label: 'Dry lean mass',
    unit: 'lbs',
    color: 'stroke-violet-600',
    required: false,
    formatValue: (value) => value.toFixed(1),
  },
  {
    key: 'bodyFatMass',
    label: 'Body fat mass',
    unit: 'lbs',
    color: 'stroke-rose-600',
    required: false,
    formatValue: (value) => value.toFixed(1),
  },
  {
    key: 'bmi',
    label: 'BMI',
    unit: 'kg/m²',
    color: 'stroke-indigo-600',
    required: false,
    formatValue: (value) => value.toFixed(1),
  },
  {
    key: 'leanBodyMass',
    label: 'Lean body mass',
    unit: 'lbs',
    color: 'stroke-teal-600',
    required: false,
    formatValue: (value) => value.toFixed(1),
  },
  {
    key: 'basalMetabolicRate',
    label: 'Basal metabolic rate',
    unit: 'kcal',
    color: 'stroke-orange-600',
    required: false,
    formatValue: (value) => Math.round(value).toString(),
  },
  {
    key: 'skeletalMuscleIndex',
    label: 'Skeletal muscle index',
    unit: 'kg/m²',
    color: 'stroke-lime-600',
    required: false,
    formatValue: (value) => value.toFixed(1),
  },
]

export function getVisibleInbodyChartMetrics(
  points: InbodyChartPoint[]
): InbodyChartMetric[] {
  return INBODY_CHART_METRICS.filter(
    (metric) =>
      metric.required || points.some((point) => point[metric.key] != null)
  )
}

export function formatInbodyScanDate(scanDate: string) {
  const date = new Date(scanDate)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatInbodyScanDateTime(scanDate: string) {
  const date = new Date(scanDate)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatInbodyChartLabel(scanDate: string) {
  const date = new Date(scanDate)
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatInbodyChartAxisLabel(scanDate: string) {
  const date = new Date(scanDate)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

export const DEFAULT_COMBINED_INBODY_METRIC_KEYS: InbodyChartMetricKey[] = [
  'weight',
  'skeletalMuscleMass',
  'percentBodyFat',
]

export const MAX_COMBINED_INBODY_METRICS = 3

export function formatInbodyMetric(value: number, unit: string) {
  const formatted =
    unit === '%'
      ? value.toFixed(1)
      : unit === 'kcal'
        ? Math.round(value).toString()
        : value.toFixed(1)
  return `${formatted} ${unit}`
}

export function createEmptyInbodyScanValues(): InbodyScanFormValues {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60_000)
  return {
    scanDate: local.toISOString().slice(0, 10),
    scanTime: local.toTimeString().slice(0, 5),
    weightLbs: null,
    skeletalMuscleMassLbs: null,
    percentBodyFat: null,
    totalBodyWaterLbs: null,
    dryLeanMassLbs: null,
    bodyFatMassLbs: null,
    bmi: null,
    leanBodyMassLbs: null,
    basalMetabolicRateKcal: null,
    skeletalMuscleIndex: null,
    notes: null,
  }
}

export function inbodyScanToFormValues(scan: ClientInbodyScan): InbodyScanFormValues {
  const date = new Date(scan.scan_date)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return {
    scanDate: local.toISOString().slice(0, 10),
    scanTime: local.toTimeString().slice(0, 5),
    weightLbs: scan.weight_lbs,
    skeletalMuscleMassLbs: scan.skeletal_muscle_mass_lbs,
    percentBodyFat: scan.percent_body_fat,
    totalBodyWaterLbs: scan.total_body_water_lbs,
    dryLeanMassLbs: scan.dry_lean_mass_lbs,
    bodyFatMassLbs: scan.body_fat_mass_lbs,
    bmi: scan.bmi,
    leanBodyMassLbs: scan.lean_body_mass_lbs,
    basalMetabolicRateKcal: scan.basal_metabolic_rate_kcal,
    skeletalMuscleIndex: scan.skeletal_muscle_index,
    notes: scan.notes,
  }
}

function combineScanDateTime(scanDate: string, scanTime: string) {
  return new Date(`${scanDate}T${scanTime}:00`).toISOString()
}

function optionalMetrics(values: InbodyScanFormValues) {
  return {
    total_body_water_lbs: values.totalBodyWaterLbs,
    dry_lean_mass_lbs: values.dryLeanMassLbs,
    body_fat_mass_lbs: values.bodyFatMassLbs,
    bmi: values.bmi,
    lean_body_mass_lbs: values.leanBodyMassLbs,
    basal_metabolic_rate_kcal: values.basalMetabolicRateKcal,
    skeletal_muscle_index: values.skeletalMuscleIndex,
    notes: values.notes,
  }
}

export function inbodyValuesToRow(
  values: InbodyScanFormValues,
  clientId: string,
  coachId: string,
  submittedBy: CheckInSubmittedBy
): ClientInbodyScanInsert {
  return {
    client_id: clientId,
    coach_id: coachId,
    scan_date: combineScanDateTime(values.scanDate, values.scanTime),
    weight_lbs: values.weightLbs!,
    skeletal_muscle_mass_lbs: values.skeletalMuscleMassLbs!,
    percent_body_fat: values.percentBodyFat!,
    ...optionalMetrics(values),
    submitted_by: submittedBy,
  }
}

export function inbodyValuesToUpdate(
  values: InbodyScanFormValues
): ClientInbodyScanUpdate {
  return {
    scan_date: combineScanDateTime(values.scanDate, values.scanTime),
    weight_lbs: values.weightLbs!,
    skeletal_muscle_mass_lbs: values.skeletalMuscleMassLbs!,
    percent_body_fat: values.percentBodyFat!,
    ...optionalMetrics(values),
  }
}

export function scansToChartPoints(scans: ClientInbodyScan[]): InbodyChartPoint[] {
  return [...scans]
    .sort(
      (left, right) =>
        new Date(left.scan_date).getTime() - new Date(right.scan_date).getTime()
    )
    .map((scan) => ({
      scanDate: scan.scan_date,
      label: formatInbodyChartLabel(scan.scan_date),
      weight: scan.weight_lbs,
      skeletalMuscleMass: scan.skeletal_muscle_mass_lbs,
      percentBodyFat: scan.percent_body_fat,
      totalBodyWater: scan.total_body_water_lbs,
      dryLeanMass: scan.dry_lean_mass_lbs,
      bodyFatMass: scan.body_fat_mass_lbs,
      bmi: scan.bmi,
      leanBodyMass: scan.lean_body_mass_lbs,
      basalMetabolicRate: scan.basal_metabolic_rate_kcal,
      skeletalMuscleIndex: scan.skeletal_muscle_index,
    }))
}

export function formatInbodyScanSummary(scan: ClientInbodyScan) {
  return `${scan.weight_lbs.toFixed(1)} lbs · ${scan.skeletal_muscle_mass_lbs.toFixed(1)} lbs SMM · ${scan.percent_body_fat.toFixed(1)}% PBF`
}
