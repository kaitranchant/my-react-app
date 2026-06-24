import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'

import {
  inbodyOcrExtractionSchema,
  type InbodyOcrExtraction,
} from '@/lib/validations/inbody-scan-ocr'
import type { InbodyScanFormValues } from '@/lib/validations/inbody-scan'

const KG_TO_LBS = 2.20462

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export const INBODY_SCAN_IMAGE_MAX_BYTES = 10 * 1024 * 1024

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  weightLbs: 'Weight',
  skeletalMuscleMassLbs: 'Skeletal muscle mass',
  percentBodyFat: 'Percent body fat',
}

const EXTRACTION_PROMPT = `You are reading an InBody body composition result sheet (e.g. InBody 270/570 printout or LookinBody app screenshot).

Extract the metrics you can read clearly. Use these field mappings:
- heightFeet: feet from header Height (e.g. 5 from "5ft. 08.0in")
- heightInchesPart: inches portion from header Height (e.g. 8.0 from "5ft. 08.0in")
- heightInches: total height in inches (feet×12 + inches, e.g. 68 for 5ft 8in). Prefer computing from feet/inches when both are visible.
- weightLbs: Weight in pounds from the current test (not target weight)
- skeletalMuscleMassLbs: Skeletal Muscle Mass, SMM (lbs) — from Muscle-Fat Analysis
- percentBodyFat: PBF, Percent Body Fat — MUST be the percentage with a % sign from "Obesity Analysis"
- totalBodyWaterLbs: Total Body Water, TBW (lbs)
- dryLeanMassLbs: Dry Lean Mass (lbs)
- bodyFatMassLbs: Body Fat Mass (lbs) — from Body Composition Analysis; this is NOT percent body fat
- bmi: BMI (kg/m²) — from "Obesity Analysis" next to PBF; unit is kg/m², typically 15–40
- leanBodyMassLbs: Lean Body Mass, LBM (lbs)
- basalMetabolicRateKcal: Basal Metabolic Rate, BMR (integer kcal)
- skeletalMuscleIndex: Skeletal Muscle Index, SMI (kg/m²)

CRITICAL — do not confuse these pairs:
1. percentBodyFat vs bodyFatMassLbs:
   - percentBodyFat is a PERCENTAGE (usually 5–50, often shown with %). Example: PBF 11.0%
   - bodyFatMassLbs is MASS in pounds (usually 10–80 lbs). Example: Body Fat Mass 19.5 lbs
   - NEVER put the body fat mass lbs value into percentBodyFat
2. bmi vs other numbers:
   - bmi comes only from the "BMI" row in Obesity Analysis (kg/m²)
   - Do not use weight, PBF, or SMI values as BMI

Rules:
- Return ALL mass values in pounds (lbs). If the sheet shows kg, convert using lbs = kg * 2.20462.
- BMI and skeletal muscle index stay in kg/m² (do not convert).
- percentBodyFat is a percentage 0–100, not a decimal fraction.
- scanDate: from "Test Date / Time" at the top of the sheet (NOT from history table rows). InBody format is often MM. DD. YYYY with dots (e.g. "06. 05. 2026"). Return as YYYY-MM-DD. Read all four year digits carefully — do not confuse 2026 with 2020.
- scanTime: HH:MM (24-hour) if a test time is visible, otherwise null.
- Return null for any field you cannot read confidently. Do not guess.
- Ignore target values, normal ranges, and historical comparison columns — only the current test values.`

export function kgToLbs(kg: number): number {
  return Math.round(kg * KG_TO_LBS * 10) / 10
}

export function expandTwoDigitYear(yy: number): number {
  return yy < 50 ? 2000 + yy : 1900 + yy
}

/** Correct common OCR year mistakes (e.g. 2026 read as 2020). */
export function correctMisreadScanYear(year: number): number {
  const currentYear = new Date().getFullYear()

  if (year > currentYear + 1) {
    return currentYear
  }

  // Common vision OCR: 2026 misread as 2020
  if (year === 2020 && currentYear >= 2024 && currentYear <= 2030) {
    return 2026
  }

  // Year more than a few years behind — try fixing last digit (e.g. 2020 → 2026)
  if (year <= currentYear - 4 && year >= 2000) {
    const decadeBase = Math.floor(year / 10) * 10
    const corrected = decadeBase + (currentYear % 10)
    if (corrected >= currentYear - 2 && corrected <= currentYear + 1) {
      return corrected
    }
  }

  return year
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function normalizeOcrDate(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const year = correctMisreadScanYear(Number(isoMatch[1]))
    return formatIsoDate(year, Number(isoMatch[2]), Number(isoMatch[3]))
  }

  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, month, day, year] = usMatch
    return formatIsoDate(
      correctMisreadScanYear(Number(year)),
      Number(month),
      Number(day)
    )
  }

  const usShortYear = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (usShortYear) {
    const [, month, day, yy] = usShortYear
    return formatIsoDate(
      correctMisreadScanYear(expandTwoDigitYear(Number(yy))),
      Number(month),
      Number(day)
    )
  }

  // InBody: "06. 05. 2026", "06.05.2026", "06.05.26"
  const inbodyMatch = trimmed.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})$/)
  if (inbodyMatch) {
    const [, month, day, yearPart] = inbodyMatch
    const year =
      yearPart.length === 2
        ? expandTwoDigitYear(Number(yearPart))
        : Number(yearPart)
    return formatIsoDate(correctMisreadScanYear(year), Number(month), Number(day))
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    const year = correctMisreadScanYear(parsed.getUTCFullYear())
    return formatIsoDate(year, parsed.getUTCMonth() + 1, parsed.getUTCDate())
  }

  return null
}

export function normalizeOcrTime(raw: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()

  const h24Match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (h24Match) {
    const [, hours, minutes] = h24Match
    const h = Number(hours)
    const m = Number(minutes)
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }

  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (ampmMatch) {
    let hours = Number(ampmMatch[1])
    const minutes = Number(ampmMatch[2])
    const period = ampmMatch[3].toUpperCase()
    if (period === 'PM' && hours < 12) hours += 12
    if (period === 'AM' && hours === 12) hours = 0
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
  }

  return null
}

function roundMetric(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function resolveHeightInches(
  raw: Pick<
    InbodyOcrExtraction,
    'heightFeet' | 'heightInchesPart' | 'heightInches'
  >
): number | null {
  if (
    raw.heightFeet != null &&
    raw.heightInchesPart != null &&
    Number.isFinite(raw.heightFeet) &&
    Number.isFinite(raw.heightInchesPart)
  ) {
    const total = raw.heightFeet * 12 + raw.heightInchesPart
    if (total >= 48 && total <= 96) {
      return roundMetric(total, 1)
    }
  }

  if (raw.heightInches != null && Number.isFinite(raw.heightInches)) {
    const total = raw.heightInches
    if (total >= 48 && total <= 96) {
      return roundMetric(total, 1)
    }
  }

  return null
}

export function computeBmiFromUsUnits(
  weightLbs: number,
  heightInches: number
): number {
  if (heightInches <= 0) return 0
  return roundMetric((703 * weightLbs) / (heightInches * heightInches), 1)
}

export function computePercentBodyFatFromMass(
  bodyFatMassLbs: number,
  weightLbs: number
): number {
  if (weightLbs <= 0) return 0
  return roundMetric((bodyFatMassLbs / weightLbs) * 100, 1)
}

/** Fix common OCR mix-ups (PBF read as fat mass lbs; BMI from wrong field). */
export function correctInbodyOcrMetrics(
  values: Partial<InbodyScanFormValues>,
  heightInches: number | null | undefined
): Partial<InbodyScanFormValues> {
  const corrected = { ...values }
  const { weightLbs, bodyFatMassLbs, percentBodyFat } = corrected

  if (weightLbs != null && bodyFatMassLbs != null && weightLbs > 0) {
    const calculatedPbf = computePercentBodyFatFromMass(
      bodyFatMassLbs,
      weightLbs
    )

    const pbfLooksLikeFatMass =
      percentBodyFat != null &&
      Math.abs(percentBodyFat - bodyFatMassLbs) < 1.5

    const pbfFarFromCalculated =
      percentBodyFat != null &&
      percentBodyFat > 14 &&
      Math.abs(percentBodyFat - calculatedPbf) > 5

    if (
      percentBodyFat == null ||
      pbfLooksLikeFatMass ||
      pbfFarFromCalculated
    ) {
      corrected.percentBodyFat = calculatedPbf
    }
  }

  if (weightLbs != null && heightInches != null && heightInches > 0) {
    corrected.bmi = computeBmiFromUsUnits(weightLbs, heightInches)
  }

  return corrected
}

export function normalizeOcrExtraction(
  raw: InbodyOcrExtraction
): Partial<InbodyScanFormValues> {
  const result: Partial<InbodyScanFormValues> = {}

  const scanDate = normalizeOcrDate(raw.scanDate)
  if (scanDate) result.scanDate = scanDate

  const scanTime = normalizeOcrTime(raw.scanTime)
  if (scanTime) result.scanTime = scanTime

  const heightInches = resolveHeightInches(raw)

  const numberFields = [
    ['weightLbs', 1],
    ['skeletalMuscleMassLbs', 1],
    ['percentBodyFat', 1],
    ['totalBodyWaterLbs', 1],
    ['dryLeanMassLbs', 1],
    ['bodyFatMassLbs', 1],
    ['bmi', 1],
    ['leanBodyMassLbs', 1],
    ['basalMetabolicRateKcal', 0],
    ['skeletalMuscleIndex', 1],
  ] as const

  for (const [key, decimals] of numberFields) {
    const value = raw[key]
    if (value != null && Number.isFinite(value)) {
      result[key] =
        decimals === 0 ? Math.round(value) : roundMetric(value, decimals)
    }
  }

  return correctInbodyOcrMetrics(result, heightInches)
}

export function getMissingRequiredInbodyFields(
  values: Partial<InbodyScanFormValues>
): string[] {
  return Object.entries(REQUIRED_FIELD_LABELS)
    .filter(([key]) => values[key as keyof InbodyScanFormValues] == null)
    .map(([, label]) => label)
}

export function validateInbodyScanImageFile(
  file: File | null | undefined
): string | null {
  if (!file || file.size === 0) {
    return 'Choose an image to scan.'
  }

  if (
    !ACCEPTED_MIME_TYPES.includes(
      file.type as (typeof ACCEPTED_MIME_TYPES)[number]
    )
  ) {
    return 'Use a JPG, PNG, or WebP image.'
  }

  if (file.size > INBODY_SCAN_IMAGE_MAX_BYTES) {
    return 'Image is too large. Choose a file under 10 MB.'
  }

  return null
}

function formatOpenAiScanError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) {
      return 'OpenAI quota exceeded. Add billing or credits at platform.openai.com/account/billing, then try again.'
    }
    if (error.status === 401) {
      return 'Invalid OpenAI API key. Check OPENAI_API_KEY in apps/next/.env.local.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Could not read metrics from this image. Try a clearer photo.'
}

export async function extractInbodyMetricsFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<Partial<InbodyScanFormValues>> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'InBody scan reading is not configured. Add OPENAI_API_KEY to your environment.'
    )
  }

  if (
    !ACCEPTED_MIME_TYPES.includes(
      mimeType as (typeof ACCEPTED_MIME_TYPES)[number]
    )
  ) {
    throw new Error('Use a JPG, PNG, or WebP image.')
  }

  const client = new OpenAI({ apiKey })
  const base64 = buffer.toString('base64')
  const dataUrl = `data:${mimeType};base64,${base64}`

  let response
  try {
    response = await client.chat.completions.parse({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: zodResponseFormat(
        inbodyOcrExtractionSchema,
        'inbody_scan_extraction'
      ),
    })
  } catch (error) {
    throw new Error(formatOpenAiScanError(error))
  }

  const parsed = response.choices[0]?.message?.parsed
  if (!parsed) {
    throw new Error('Could not read metrics from this image. Try a clearer photo.')
  }

  return normalizeOcrExtraction(parsed)
}
