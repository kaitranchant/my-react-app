import type { PreviousSetLog, WorkoutLogFieldFlags, WorkoutLogSetDraft } from '@/lib/workout-log'
import type { WeightUnit } from 'app/types/database'

export type WorkoutLogKeypadField =
  | 'weight'
  | 'reps'
  | 'durationSeconds'
  | 'barSpeed'
  | 'peakPower'

export type ActiveKeypadTarget = {
  exerciseId: string
  setNumber: number
  field: WorkoutLogKeypadField
}

const DECIMAL_FIELDS = new Set<WorkoutLogKeypadField>([
  'weight',
  'barSpeed',
  'peakPower',
])

export function fieldAllowsDecimal(field: WorkoutLogKeypadField): boolean {
  return DECIMAL_FIELDS.has(field)
}

export function getWeightIncrement(unit: WeightUnit): number {
  return unit === 'kg' ? 1.25 : 2.5
}

export function getDefaultBarWeight(unit: WeightUnit): number {
  return unit === 'kg' ? 20 : 45
}

export function getStandardPlates(unit: WeightUnit): number[] {
  return unit === 'kg'
    ? [25, 20, 15, 10, 5, 2.5, 1.25]
    : [45, 35, 25, 10, 5, 2.5]
}

export function formatKeypadWeight(value: number, unit: WeightUnit): string {
  if (!Number.isFinite(value) || value < 0) return '0'
  const precision = unit === 'kg' ? 2 : 1
  const rounded = Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision)
  return String(rounded)
}

export function appendKeypadDigit(
  current: string,
  digit: string,
  field: WorkoutLogKeypadField
): string {
  if (digit === '.') {
    if (!fieldAllowsDecimal(field)) return current
    if (current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }

  if (!/^\d$/.test(digit)) return current

  if (current === '0' && digit !== '.') {
    return digit
  }

  return `${current}${digit}`
}

export function backspaceKeypadValue(current: string): string {
  return current.slice(0, -1)
}

export function adjustKeypadWeight(
  current: string,
  delta: number,
  unit: WeightUnit
): string {
  const parsed = Number.parseFloat(current)
  const base = Number.isFinite(parsed) ? parsed : 0
  const next = Math.max(0, base + delta)
  return formatKeypadWeight(next, unit)
}

export function getVisibleKeypadFields(
  fields: WorkoutLogFieldFlags
): WorkoutLogKeypadField[] {
  const visible: WorkoutLogKeypadField[] = []
  if (fields.showWeight) visible.push('weight')
  if (fields.showReps) visible.push('reps')
  if (fields.showDuration) visible.push('durationSeconds')
  if (fields.showBarSpeed) visible.push('barSpeed')
  if (fields.showPeakPower) visible.push('peakPower')
  return visible
}

export function getNextKeypadTarget(
  current: ActiveKeypadTarget,
  sets: WorkoutLogSetDraft[],
  fields: WorkoutLogFieldFlags
): ActiveKeypadTarget | null {
  const visibleFields = getVisibleKeypadFields(fields)
  if (visibleFields.length === 0) return null

  const fieldIndex = visibleFields.indexOf(current.field)
  if (fieldIndex === -1) return null

  if (fieldIndex < visibleFields.length - 1) {
    return {
      exerciseId: current.exerciseId,
      setNumber: current.setNumber,
      field: visibleFields[fieldIndex + 1]!,
    }
  }

  const nextIncompleteSet = sets.find(
    (set) => set.setNumber > current.setNumber && !set.completed
  )
  if (nextIncompleteSet) {
    return {
      exerciseId: current.exerciseId,
      setNumber: nextIncompleteSet.setNumber,
      field: visibleFields[0]!,
    }
  }

  const firstIncompleteSet = sets.find((set) => !set.completed)
  if (
    firstIncompleteSet &&
    firstIncompleteSet.setNumber !== current.setNumber
  ) {
    return {
      exerciseId: current.exerciseId,
      setNumber: firstIncompleteSet.setNumber,
      field: visibleFields[0]!,
    }
  }

  return null
}

export function getCopyValuesForSet(
  setNumber: number,
  sets: WorkoutLogSetDraft[],
  previousSets: Record<number, PreviousSetLog>,
  fields: WorkoutLogFieldFlags
): Partial<WorkoutLogSetDraft> {
  const patch: Partial<WorkoutLogSetDraft> = {}

  if (setNumber > 1) {
    const prior = sets.find((set) => set.setNumber === setNumber - 1)
    if (prior) {
      if (fields.showWeight) patch.weight = prior.weight
      if (fields.showReps) patch.reps = prior.reps
      if (fields.showDuration) patch.durationSeconds = prior.durationSeconds
      if (fields.showBarSpeed) patch.barSpeed = prior.barSpeed
      if (fields.showPeakPower) patch.peakPower = prior.peakPower
      return patch
    }
  }

  const previous = previousSets[setNumber]
  if (previous) {
    if (fields.showWeight && previous.weight != null) {
      patch.weight = String(previous.weight)
    }
    if (fields.showReps && previous.reps != null) {
      patch.reps = String(previous.reps)
    }
    if (fields.showDuration && previous.durationSeconds != null) {
      patch.durationSeconds = String(previous.durationSeconds)
    }
  }

  return patch
}

export type PlateCount = {
  weight: number
  count: number
}

export type PlateCalculationResult = {
  platesPerSide: PlateCount[]
  remainderPerSide: number
  achievable: boolean
}

export function calculatePlatesPerSide(
  totalWeight: number,
  barWeight: number,
  availablePlates: number[]
): PlateCalculationResult {
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return { platesPerSide: [], remainderPerSide: 0, achievable: true }
  }

  const sortedPlates = [...availablePlates].sort((a, b) => b - a)
  let weightPerSide = (totalWeight - barWeight) / 2

  if (weightPerSide < 0) {
    return {
      platesPerSide: [],
      remainderPerSide: Math.abs(weightPerSide),
      achievable: false,
    }
  }

  const platesPerSide: PlateCount[] = []
  const tolerance = 0.001

  for (const plate of sortedPlates) {
    if (plate <= 0) continue
    const count = Math.floor((weightPerSide + tolerance) / plate)
    if (count > 0) {
      platesPerSide.push({ weight: plate, count })
      weightPerSide -= count * plate
    }
  }

  const remainderPerSide = Math.round(weightPerSide * 1000) / 1000

  return {
    platesPerSide,
    remainderPerSide,
    achievable: remainderPerSide < tolerance,
  }
}

export function formatPlateStack(plates: PlateCount[], unit: WeightUnit): string {
  if (plates.length === 0) return 'Bar only'
  const suffix = unit === 'kg' ? 'kg' : 'lb'
  return plates
    .map((plate) => `${plate.weight}${suffix} × ${plate.count}`)
    .join(', ')
}
