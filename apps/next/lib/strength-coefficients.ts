export type BiologicalSex = 'male' | 'female'
export type RelativeStrengthFormula = 'dots' | 'wilks'

const LBS_TO_KG = 0.45359237

type PolynomialCoefficients = {
  a: number
  b: number
  c: number
  d: number
  e: number
  f?: number
}

const DOTS_COEFFICIENTS: Record<BiologicalSex, PolynomialCoefficients> = {
  male: {
    a: -307.75076,
    b: 24.0900756,
    c: -0.1918759221,
    d: 0.0007391293,
    e: -0.000001093,
  },
  female: {
    a: -57.96288,
    b: 13.6175032,
    c: -0.1126655495,
    d: 0.0005158568,
    e: -0.0000010706,
  },
}

const WILKS_COEFFICIENTS: Record<BiologicalSex, PolynomialCoefficients> = {
  male: {
    a: -216.0475144,
    b: 16.2606339,
    c: -0.002388645,
    d: -0.00113732,
    e: 0.00000701863,
    f: -0.00000001291,
  },
  female: {
    a: 594.31747775582,
    b: -27.23842536447,
    c: 0.82112226871,
    d: -0.00930733913,
    e: 0.00004731582,
    f: -0.00000009054,
  },
}

const DOTS_BODYWEIGHT_BOUNDS: Record<BiologicalSex, { min: number; max: number }> = {
  male: { min: 40, max: 210 },
  female: { min: 40, max: 150 },
}

const WILKS_BODYWEIGHT_BOUNDS: Record<BiologicalSex, { min: number; max: number }> = {
  male: { min: 40, max: 201.9 },
  female: { min: 40, max: 150.9 },
}

export function lbsToKg(weightLbs: number): number {
  return weightLbs * LBS_TO_KG
}

function evaluatePolynomial(
  bodyweightKg: number,
  coefficients: PolynomialCoefficients
): number {
  const { a, b, c, d, e, f } = coefficients
  const bw2 = bodyweightKg * bodyweightKg
  const bw3 = bw2 * bodyweightKg
  const bw4 = bw3 * bodyweightKg
  const bw5 = bw4 * bodyweightKg

  return (
    a +
    b * bodyweightKg +
    c * bw2 +
    d * bw3 +
    e * bw4 +
    (f ?? 0) * bw5
  )
}

function clampBodyweightKg(
  bodyweightKg: number,
  sex: BiologicalSex,
  formula: RelativeStrengthFormula
): number {
  const bounds =
    formula === 'dots'
      ? DOTS_BODYWEIGHT_BOUNDS[sex]
      : WILKS_BODYWEIGHT_BOUNDS[sex]

  return Math.min(bounds.max, Math.max(bounds.min, bodyweightKg))
}

export function calculateDotsScore(
  totalKg: number,
  bodyweightKg: number,
  sex: BiologicalSex
): number | null {
  if (totalKg <= 0 || bodyweightKg <= 0) return null

  const adjustedBodyweight = clampBodyweightKg(bodyweightKg, sex, 'dots')
  const denominator = evaluatePolynomial(adjustedBodyweight, DOTS_COEFFICIENTS[sex])
  if (denominator <= 0) return null

  return (totalKg * 500) / denominator
}

export function calculateWilksScore(
  totalKg: number,
  bodyweightKg: number,
  sex: BiologicalSex
): number | null {
  if (totalKg <= 0 || bodyweightKg <= 0) return null

  const adjustedBodyweight = clampBodyweightKg(bodyweightKg, sex, 'wilks')
  const denominator = evaluatePolynomial(adjustedBodyweight, WILKS_COEFFICIENTS[sex])
  if (denominator <= 0) return null

  return (totalKg * 600) / denominator
}

export function calculateRelativeStrengthScore(
  totalLbs: number,
  bodyweightLbs: number,
  sex: BiologicalSex,
  formula: RelativeStrengthFormula
): number | null {
  const totalKg = lbsToKg(totalLbs)
  const bodyweightKg = lbsToKg(bodyweightLbs)

  return formula === 'dots'
    ? calculateDotsScore(totalKg, bodyweightKg, sex)
    : calculateWilksScore(totalKg, bodyweightKg, sex)
}

export function formatRelativeStrengthScore(score: number): string {
  return Math.round(score).toLocaleString('en-US')
}
