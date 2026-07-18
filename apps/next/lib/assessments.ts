import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  AssessmentItem,
  AssessmentItemCategory,
  AssessmentRubricType,
  ClientAssessment,
  ClientAssessmentMedia,
  ClientAssessmentMediaWithUrl,
  ClientAssessmentResult,
  ClientAssessmentResultWithMedia,
  ClientAssessmentWithResults,
  Json,
} from 'app/types/database'
import {
  FORM_REVIEW_ALLOWED_MIME_TYPES,
  FORM_REVIEW_FILE_ACCEPT,
  FORM_REVIEW_IMAGE_MIME_TYPES,
  FORM_REVIEW_MAX_IMAGE_BYTES,
  FORM_REVIEW_MAX_VIDEO_BYTES,
  FORM_REVIEW_SIGNED_URL_TTL_SECONDS,
  FORM_REVIEW_UPLOAD_HINT,
  FORM_REVIEW_VIDEO_MIME_TYPES,
  getFormReviewMaxUploadBytes,
  isFormReviewImage,
  isFormReviewMimeType,
  normalizeFormReviewMimeType,
  resolveFormReviewContentType,
  type FormReviewMimeType,
} from '@/lib/form-reviews'

export const ASSESSMENT_MEDIA_BUCKET = 'assessment-media'
export const ASSESSMENT_MEDIA_MAX_VIDEO_BYTES = FORM_REVIEW_MAX_VIDEO_BYTES
export const ASSESSMENT_MEDIA_MAX_IMAGE_BYTES = FORM_REVIEW_MAX_IMAGE_BYTES
export const ASSESSMENT_MEDIA_SIGNED_URL_TTL_SECONDS =
  FORM_REVIEW_SIGNED_URL_TTL_SECONDS
export const ASSESSMENT_MEDIA_FILE_ACCEPT = FORM_REVIEW_FILE_ACCEPT
export const ASSESSMENT_MEDIA_UPLOAD_HINT = FORM_REVIEW_UPLOAD_HINT
export const ASSESSMENT_MEDIA_ALLOWED_MIME_TYPES = FORM_REVIEW_ALLOWED_MIME_TYPES
export const ASSESSMENT_MEDIA_VIDEO_MIME_TYPES = FORM_REVIEW_VIDEO_MIME_TYPES
export const ASSESSMENT_MEDIA_IMAGE_MIME_TYPES = FORM_REVIEW_IMAGE_MIME_TYPES

export type AssessmentMediaMimeType = FormReviewMimeType

export const ASSESSMENT_CATEGORY_LABELS: Record<AssessmentItemCategory, string> = {
  mobility: 'Movement screen / mobility',
  posture: 'Postural assessment',
  strength: 'Strength testing',
  cardiovascular: 'Cardiovascular',
  power: 'Power / athletic',
  body_composition: 'Body composition',
  health_intake: 'Health / intake',
  custom: 'Custom',
}

export const ASSESSMENT_CATEGORY_ORDER: AssessmentItemCategory[] = [
  'mobility',
  'posture',
  'strength',
  'cardiovascular',
  'power',
  'body_composition',
  'health_intake',
  'custom',
]

const MIME_TO_EXTENSION: Record<AssessmentMediaMimeType, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export {
  getFormReviewMaxUploadBytes as getAssessmentMediaMaxUploadBytes,
  isFormReviewImage as isAssessmentMediaImage,
  isFormReviewMimeType as isAssessmentMediaMimeType,
  normalizeFormReviewMimeType as normalizeAssessmentMediaMimeType,
  resolveFormReviewContentType as resolveAssessmentMediaContentType,
}

export function assessmentMediaStoragePath(input: {
  clientId: string
  assessmentId: string
  resultId: string
  mediaId: string
  contentType: string
}) {
  const normalizedType = normalizeFormReviewMimeType(input.contentType)
  const extension = isFormReviewMimeType(normalizedType)
    ? MIME_TO_EXTENSION[normalizedType]
    : '.bin'
  return `clients/${input.clientId}/${input.assessmentId}/${input.resultId}/${input.mediaId}${extension}`
}

export type AssessmentMetricField = {
  key: string
  label: string
  unit?: string
}

export type AssessmentQuestionnaireQuestion = {
  id: string
  text: string
}

export type ParsedAssessmentRubricConfig = {
  min?: number
  max?: number
  labels?: string[]
  passLabel?: string
  failLabel?: string
  unit?: string
  higherIsBetter?: boolean | null
  bilateral?: boolean
  painFlag?: boolean
  observations?: string[]
  alternateUnits?: string[]
  fields?: AssessmentMetricField[]
  mode?: 'multi_yes_no' | 'yes_no_text' | 'scale_text'
  escalateOnYes?: boolean
  questions?: AssessmentQuestionnaireQuestion[]
  yesLabel?: string
  noLabel?: string
  prompt?: string
}

export type AssessmentScoreData = {
  left?: number | boolean | null
  right?: number | boolean | null
  observations?: Record<string, boolean>
  fields?: Record<string, number | null>
  answers?: Record<string, boolean | number | null>
  yesNo?: boolean | null
  text?: string | null
  scale?: number | null
  escalated?: boolean
  [key: string]: unknown
}

export function humanizeObservationKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function parseAssessmentScoreData(
  value: Json | null | undefined
): AssessmentScoreData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as AssessmentScoreData
}

export function parseAssessmentRubricConfig(
  rubricType: AssessmentRubricType,
  config: Json | null | undefined
): ParsedAssessmentRubricConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {}
  }

  const record = config as Record<string, unknown>

  if (rubricType === 'scale') {
    const min = typeof record.min === 'number' ? record.min : 0
    const max = typeof record.max === 'number' ? record.max : 3
    const labels = Array.isArray(record.labels)
      ? record.labels.filter((label): label is string => typeof label === 'string')
      : undefined
    return {
      min,
      max,
      labels,
      bilateral: record.bilateral === true,
      painFlag: record.painFlag === true,
    }
  }

  if (rubricType === 'pass_fail') {
    const observations = Array.isArray(record.observations)
      ? record.observations.filter(
          (item): item is string => typeof item === 'string'
        )
      : undefined
    return {
      passLabel:
        typeof record.passLabel === 'string' ? record.passLabel : 'Pass',
      failLabel:
        typeof record.failLabel === 'string' ? record.failLabel : 'Fail',
      bilateral: record.bilateral === true,
      observations,
    }
  }

  if (rubricType === 'measurement') {
    const fields = Array.isArray(record.fields)
      ? record.fields.flatMap((field): AssessmentMetricField[] => {
          if (!field || typeof field !== 'object' || Array.isArray(field)) {
            return []
          }
          const row = field as Record<string, unknown>
          if (typeof row.key !== 'string' || typeof row.label !== 'string') {
            return []
          }
          return [
            {
              key: row.key,
              label: row.label,
              ...(typeof row.unit === 'string' ? { unit: row.unit } : {}),
            },
          ]
        })
      : undefined
    const alternateUnits = Array.isArray(record.alternateUnits)
      ? record.alternateUnits.filter(
          (unit): unit is string => typeof unit === 'string'
        )
      : undefined
    return {
      unit: typeof record.unit === 'string' ? record.unit : 'units',
      higherIsBetter:
        typeof record.higherIsBetter === 'boolean'
          ? record.higherIsBetter
          : record.higherIsBetter === null
            ? null
            : true,
      bilateral: record.bilateral === true,
      alternateUnits,
      fields,
    }
  }

  if (rubricType === 'questionnaire') {
    const mode =
      record.mode === 'multi_yes_no' ||
      record.mode === 'yes_no_text' ||
      record.mode === 'scale_text'
        ? record.mode
        : 'yes_no_text'
    const questions = Array.isArray(record.questions)
      ? record.questions
          .map((question) => {
            if (
              !question ||
              typeof question !== 'object' ||
              Array.isArray(question)
            ) {
              return null
            }
            const row = question as Record<string, unknown>
            if (typeof row.id !== 'string' || typeof row.text !== 'string') {
              return null
            }
            return { id: row.id, text: row.text }
          })
          .filter(
            (question): question is AssessmentQuestionnaireQuestion =>
              question != null
          )
      : undefined
    const labels = Array.isArray(record.labels)
      ? record.labels.filter((label): label is string => typeof label === 'string')
      : undefined
    return {
      mode,
      escalateOnYes: record.escalateOnYes === true,
      questions,
      yesLabel: typeof record.yesLabel === 'string' ? record.yesLabel : 'Yes',
      noLabel: typeof record.noLabel === 'string' ? record.noLabel : 'No',
      prompt: typeof record.prompt === 'string' ? record.prompt : undefined,
      min: typeof record.min === 'number' ? record.min : 1,
      max: typeof record.max === 'number' ? record.max : 5,
      labels,
    }
  }

  return {}
}

export function getNumericScore(
  result: Pick<
    ClientAssessmentResult,
    'rubric_type' | 'scale_score' | 'measurement_value' | 'pass_fail'
  >
): number | null {
  if (result.rubric_type === 'scale') {
    return result.scale_score
  }
  if (result.rubric_type === 'measurement') {
    return result.measurement_value
  }
  if (result.rubric_type === 'pass_fail') {
    if (result.pass_fail == null) return null
    return result.pass_fail ? 1 : 0
  }
  return null
}

function formatSideNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Math.round(value * 100) / 100)
}

export function formatAssessmentScore(
  result: Pick<
    ClientAssessmentResult,
    | 'rubric_type'
    | 'rubric_config'
    | 'scale_score'
    | 'pass_fail'
    | 'measurement_value'
    | 'measurement_unit'
  > & {
    score_data?: Json | null
  }
): string {
  const config = parseAssessmentRubricConfig(
    result.rubric_type,
    result.rubric_config
  )
  const scoreData = parseAssessmentScoreData(result.score_data)

  if (result.rubric_type === 'scale') {
    if (
      config.bilateral &&
      typeof scoreData.left === 'number' &&
      typeof scoreData.right === 'number'
    ) {
      return `L ${scoreData.left} · R ${scoreData.right}`
    }
    if (result.scale_score == null) return '—'
    const min = config.min ?? 0
    const max = config.max ?? 3
    const index = Math.round(result.scale_score - min)
    const label = config.labels?.[index]
    const pain =
      config.painFlag && result.scale_score === min ? ' · Injury flag' : ''
    return label
      ? `${result.scale_score}/${max} · ${label}${pain}`
      : `${result.scale_score}/${max}${pain}`
  }

  if (result.rubric_type === 'pass_fail') {
    if (
      config.bilateral &&
      typeof scoreData.left === 'boolean' &&
      typeof scoreData.right === 'boolean'
    ) {
      const pass = config.passLabel ?? 'Pass'
      const fail = config.failLabel ?? 'Fail'
      return `L ${scoreData.left ? pass : fail} · R ${scoreData.right ? pass : fail}`
    }
    if (config.observations?.length && scoreData.observations) {
      const present = config.observations.filter(
        (key) => scoreData.observations?.[key]
      )
      if (present.length === 0) return config.passLabel ?? 'Clear'
      return `${present.length} deviation${present.length === 1 ? '' : 's'}`
    }
    if (result.pass_fail == null) return '—'
    return result.pass_fail
      ? (config.passLabel ?? 'Pass')
      : (config.failLabel ?? 'Fail')
  }

  if (result.rubric_type === 'measurement') {
    if (config.fields?.length && scoreData.fields) {
      const parts = config.fields
        .map((field) => {
          const value = scoreData.fields?.[field.key]
          if (typeof value !== 'number') return null
          const unit = field.unit ?? config.unit ?? ''
          return unit
            ? `${field.label} ${formatSideNumber(value)} ${unit}`
            : `${field.label} ${formatSideNumber(value)}`
        })
        .filter((part): part is string => Boolean(part))
      return parts.length > 0 ? parts.join(' · ') : '—'
    }
    if (
      config.bilateral &&
      typeof scoreData.left === 'number' &&
      typeof scoreData.right === 'number'
    ) {
      const unit = result.measurement_unit ?? config.unit ?? ''
      const left = formatSideNumber(scoreData.left)
      const right = formatSideNumber(scoreData.right)
      return unit
        ? `L ${left} ${unit} · R ${right} ${unit}`
        : `L ${left} · R ${right}`
    }
    if (result.measurement_value == null) return '—'
    const unit = result.measurement_unit ?? config.unit ?? ''
    const value = formatSideNumber(result.measurement_value)
    return unit ? `${value} ${unit}` : value
  }

  if (result.rubric_type === 'questionnaire') {
    if (config.mode === 'multi_yes_no' && scoreData.answers) {
      const yesCount = Object.values(scoreData.answers).filter(
        (answer) => answer === true
      ).length
      return scoreData.escalated || yesCount > 0
        ? `${yesCount} yes · review`
        : 'All clear'
    }
    if (config.mode === 'yes_no_text') {
      if (typeof scoreData.yesNo !== 'boolean') return '—'
      return scoreData.yesNo
        ? (config.yesLabel ?? 'Yes')
        : (config.noLabel ?? 'No')
    }
    if (config.mode === 'scale_text' && typeof scoreData.scale === 'number') {
      const min = config.min ?? 1
      const index = Math.round(scoreData.scale - min)
      const label = config.labels?.[index]
      return label ? `${scoreData.scale} · ${label}` : String(scoreData.scale)
    }
    return 'Completed'
  }

  return 'Notes'
}

export type AssessmentScoreDetail = {
  label: string
  value: string
  tone?: 'default' | 'alert' | 'muted'
}

/** Full breakdown for history views (question answers, notes, observations, etc.). */
export function getAssessmentScoreDetails(
  result: Pick<
    ClientAssessmentResult,
    'rubric_type' | 'rubric_config' | 'notes'
  > & {
    score_data?: Json | null
  }
): AssessmentScoreDetail[] {
  const config = parseAssessmentRubricConfig(
    result.rubric_type,
    result.rubric_config
  )
  const scoreData = parseAssessmentScoreData(result.score_data)
  const details: AssessmentScoreDetail[] = []

  if (result.rubric_type === 'pass_fail' && config.observations?.length) {
    for (const key of config.observations) {
      const present = scoreData.observations?.[key]
      if (typeof present !== 'boolean') continue
      details.push({
        label: humanizeObservationKey(key),
        value: present ? 'Present' : 'Absent',
        tone: present ? 'alert' : 'muted',
      })
    }
  }

  if (result.rubric_type === 'questionnaire') {
    if (config.mode === 'multi_yes_no' && config.questions?.length) {
      for (const question of config.questions) {
        const answer = scoreData.answers?.[question.id]
        if (typeof answer !== 'boolean') continue
        details.push({
          label: question.text,
          value: answer ? 'Yes' : 'No',
          tone: answer ? 'alert' : 'muted',
        })
      }
    }

    if (config.mode === 'yes_no_text') {
      if (typeof scoreData.yesNo === 'boolean') {
        details.push({
          label: config.prompt ?? 'Response',
          value: scoreData.yesNo
            ? (config.yesLabel ?? 'Yes')
            : (config.noLabel ?? 'No'),
          tone: scoreData.yesNo ? 'alert' : 'muted',
        })
      }
      if (scoreData.text?.trim()) {
        details.push({
          label: 'Details',
          value: scoreData.text.trim(),
        })
      }
    }

    if (config.mode === 'scale_text') {
      if (typeof scoreData.scale === 'number') {
        const min = config.min ?? 1
        const index = Math.round(scoreData.scale - min)
        const label = config.labels?.[index]
        details.push({
          label: config.prompt ?? 'Rating',
          value: label ? `${scoreData.scale} · ${label}` : String(scoreData.scale),
        })
      }
      if (scoreData.text?.trim()) {
        details.push({
          label: 'Details',
          value: scoreData.text.trim(),
        })
      }
    }
  }

  if (
    result.rubric_type === 'scale' &&
    config.bilateral &&
    typeof scoreData.left === 'number' &&
    typeof scoreData.right === 'number' &&
    config.labels?.length
  ) {
    const min = config.min ?? 0
    const leftLabel = config.labels[Math.round(scoreData.left - min)]
    const rightLabel = config.labels[Math.round(scoreData.right - min)]
    details.push({
      label: 'Left',
      value: leftLabel
        ? `${scoreData.left} · ${leftLabel}`
        : String(scoreData.left),
      tone:
        config.painFlag && scoreData.left === min ? 'alert' : 'default',
    })
    details.push({
      label: 'Right',
      value: rightLabel
        ? `${scoreData.right} · ${rightLabel}`
        : String(scoreData.right),
      tone:
        config.painFlag && scoreData.right === min ? 'alert' : 'default',
    })
  }

  return details
}

export function isAssessmentResultScored(input: {
  rubricType: AssessmentRubricType
  rubricConfig: Json | null | undefined
  scaleScore: number | null
  passFail: boolean | null
  measurementValue: number | null
  scoreData?: AssessmentScoreData | Json | null
  notes?: string | null
  hasMedia?: boolean
}): boolean {
  const config = parseAssessmentRubricConfig(input.rubricType, input.rubricConfig)
  const scoreData = parseAssessmentScoreData(
    (input.scoreData ?? {}) as Json
  )

  if (input.rubricType === 'scale') {
    if (config.bilateral) {
      return (
        typeof scoreData.left === 'number' && typeof scoreData.right === 'number'
      )
    }
    return input.scaleScore != null
  }

  if (input.rubricType === 'pass_fail') {
    const observationsComplete =
      !config.observations?.length ||
      config.observations.every(
        (key) => typeof scoreData.observations?.[key] === 'boolean'
      )

    if (config.bilateral) {
      return (
        typeof scoreData.left === 'boolean' &&
        typeof scoreData.right === 'boolean' &&
        observationsComplete
      )
    }
    if (config.observations?.length) {
      return observationsComplete
    }
    return input.passFail != null
  }

  if (input.rubricType === 'measurement') {
    if (config.fields?.length) {
      return config.fields.every(
        (field) => typeof scoreData.fields?.[field.key] === 'number'
      )
    }
    if (config.bilateral) {
      return (
        typeof scoreData.left === 'number' && typeof scoreData.right === 'number'
      )
    }
    return input.measurementValue != null
  }

  if (input.rubricType === 'questionnaire') {
    if (config.mode === 'multi_yes_no') {
      return Boolean(
        config.questions?.length &&
          config.questions.every(
            (question) => typeof scoreData.answers?.[question.id] === 'boolean'
          )
      )
    }
    if (config.mode === 'yes_no_text') {
      return typeof scoreData.yesNo === 'boolean'
    }
    if (config.mode === 'scale_text') {
      return typeof scoreData.scale === 'number'
    }
    return false
  }

  return Boolean(input.notes?.trim()) || Boolean(input.hasMedia)
}

export function formatAssessmentDelta(
  delta: number | null | undefined,
  rubricType: AssessmentRubricType,
  higherIsBetter?: boolean | null
): { label: string; direction: 'up' | 'down' | 'flat' | 'neutral' } | null {
  if (delta == null || Number.isNaN(delta)) return null
  if (delta === 0) {
    return { label: 'No change', direction: 'flat' }
  }

  const rounded =
    Math.abs(delta) >= 10
      ? Math.round(delta)
      : Math.round(delta * 100) / 100
  const sign = rounded > 0 ? '+' : ''
  const label =
    rubricType === 'pass_fail'
      ? rounded > 0
        ? 'Improved'
        : 'Declined'
      : `${sign}${rounded}`

  if (higherIsBetter == null && rubricType !== 'pass_fail') {
    return { label, direction: 'neutral' }
  }

  const improved =
    higherIsBetter === false ? rounded < 0 : rounded > 0

  return {
    label,
    direction: improved ? 'up' : 'down',
  }
}

export function computeResultDelta(
  current: Pick<
    ClientAssessmentResult,
    | 'assessment_item_id'
    | 'item_name'
    | 'rubric_type'
    | 'rubric_config'
    | 'scale_score'
    | 'measurement_value'
    | 'pass_fail'
  >,
  previous: Pick<
    ClientAssessmentResult,
    | 'assessment_item_id'
    | 'item_name'
    | 'rubric_type'
    | 'scale_score'
    | 'measurement_value'
    | 'pass_fail'
  > | null
): number | null {
  if (!previous) return null
  if (current.rubric_type !== previous.rubric_type) return null
  if (current.rubric_type === 'notes') return null

  const sameItem =
    (current.assessment_item_id &&
      previous.assessment_item_id &&
      current.assessment_item_id === previous.assessment_item_id) ||
    current.item_name === previous.item_name

  if (!sameItem) return null

  const currentScore = getNumericScore(current)
  const previousScore = getNumericScore(previous)
  if (currentScore == null || previousScore == null) return null

  return currentScore - previousScore
}

export function attachDeltasToAssessment(
  assessment: ClientAssessmentWithResults,
  previous: ClientAssessmentWithResults | null
): ClientAssessmentWithResults {
  if (!previous) {
    return {
      ...assessment,
      results: assessment.results.map((result) => ({
        ...result,
        delta: null,
        previousScoreLabel: null,
      })),
    }
  }

  return {
    ...assessment,
    results: assessment.results.map((result) => {
      const prior =
        previous.results.find(
          (candidate) =>
            (result.assessment_item_id &&
              candidate.assessment_item_id === result.assessment_item_id) ||
            candidate.item_name === result.item_name
        ) ?? null

      return {
        ...result,
        delta: computeResultDelta(result, prior),
        previousScoreLabel: prior ? formatAssessmentScore(prior) : null,
      }
    }),
  }
}

export function formatAssessmentDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function groupAssessmentItemsByCategory(items: AssessmentItem[]) {
  const groups: Array<{ category: AssessmentItemCategory; items: AssessmentItem[] }> =
    []

  for (const category of ASSESSMENT_CATEGORY_ORDER) {
    const categoryItems = items.filter((item) => item.category === category)
    if (categoryItems.length > 0) {
      groups.push({ category, items: categoryItems })
    }
  }

  return groups
}

export async function attachSignedUrlsToAssessmentMedia(
  supabase: SupabaseClient,
  media: ClientAssessmentMedia[]
): Promise<ClientAssessmentMediaWithUrl[]> {
  return Promise.all(
    media.map(async (item) => {
      const { data } = await supabase.storage
        .from(ASSESSMENT_MEDIA_BUCKET)
        .createSignedUrl(item.storage_path, ASSESSMENT_MEDIA_SIGNED_URL_TTL_SECONDS)

      return {
        ...item,
        signedUrl: data?.signedUrl ?? null,
      }
    })
  )
}

export async function loadClientAssessmentsWithResults(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientAssessmentWithResults[]> {
  const { data: sessions, error } = await supabase
    .from('client_assessments')
    .select('*')
    .eq('client_id', clientId)
    .order('assessed_at', { ascending: false })

  if (error || !sessions?.length) {
    return []
  }

  const sessionIds = sessions.map((session) => session.id)
  const { data: results, error: resultsError } = await supabase
    .from('client_assessment_results')
    .select('*')
    .in('assessment_id', sessionIds)
    .order('sort_order', { ascending: true })

  if (resultsError) {
    return sessions.map((session) => ({ ...session, results: [] }))
  }

  const resultIds = (results ?? []).map((result) => result.id)
  let mediaRows: ClientAssessmentMedia[] = []
  if (resultIds.length > 0) {
    const { data: media } = await supabase
      .from('client_assessment_media')
      .select('*')
      .in('result_id', resultIds)
      .order('sort_order', { ascending: true })
    mediaRows = media ?? []
  }

  const mediaWithUrls = await attachSignedUrlsToAssessmentMedia(supabase, mediaRows)
  const mediaByResult = new Map<string, ClientAssessmentMediaWithUrl[]>()
  for (const media of mediaWithUrls) {
    const list = mediaByResult.get(media.result_id) ?? []
    list.push(media)
    mediaByResult.set(media.result_id, list)
  }

  const resultsBySession = new Map<string, ClientAssessmentResultWithMedia[]>()
  for (const result of results ?? []) {
    const list = resultsBySession.get(result.assessment_id) ?? []
    list.push({
      ...result,
      media: mediaByResult.get(result.id) ?? [],
    })
    resultsBySession.set(result.assessment_id, list)
  }

  const withResults: ClientAssessmentWithResults[] = sessions.map((session) => ({
    ...session,
    results: resultsBySession.get(session.id) ?? [],
  }))

  return withResults.map((session, index) => {
    const previous = withResults[index + 1] ?? null
    return attachDeltasToAssessment(session, previous)
  })
}

export function hasClientAssessmentHistory(
  assessments: Pick<ClientAssessment, 'id'>[] | null | undefined
): boolean {
  return Boolean(assessments && assessments.length > 0)
}

export function clientHasAssessmentRecord(input: {
  legacyNotes?: string | null
  assessmentCount?: number
}): boolean {
  return (
    Boolean(input.legacyNotes?.trim()) ||
    Boolean(input.assessmentCount && input.assessmentCount > 0)
  )
}
