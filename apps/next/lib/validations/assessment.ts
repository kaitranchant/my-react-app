import { z } from 'zod'

export const assessmentItemCategories = [
  'mobility',
  'posture',
  'strength',
  'cardiovascular',
  'power',
  'body_composition',
  'health_intake',
  'custom',
] as const

export const assessmentRubricTypes = [
  'scale',
  'pass_fail',
  'measurement',
  'notes',
  'questionnaire',
] as const

export const assessmentSessionSources = [
  'manual',
  'onboarding',
  'legacy_import',
] as const

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) =>
      value === '' || value === undefined || value === null ? null : value
    )

const metricFieldSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(20).optional(),
})

const questionnaireQuestionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(240),
})

export const scaleRubricConfigSchema = z.object({
  min: z.number().finite(),
  max: z.number().finite(),
  labels: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  bilateral: z.boolean().optional(),
  painFlag: z.boolean().optional(),
})

export const passFailRubricConfigSchema = z.object({
  passLabel: z.string().trim().min(1).max(40).optional(),
  failLabel: z.string().trim().min(1).max(40).optional(),
  bilateral: z.boolean().optional(),
  observations: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
})

export const measurementRubricConfigSchema = z.object({
  unit: z.string().trim().min(1).max(20),
  higherIsBetter: z.boolean().nullable().optional(),
  bilateral: z.boolean().optional(),
  alternateUnits: z.array(z.string().trim().min(1).max(20)).max(8).optional(),
  fields: z.array(metricFieldSchema).max(20).optional(),
})

export const notesRubricConfigSchema = z.object({}).passthrough()

export const questionnaireRubricConfigSchema = z
  .object({
    mode: z.enum(['multi_yes_no', 'yes_no_text', 'scale_text']),
    escalateOnYes: z.boolean().optional(),
    questions: z.array(questionnaireQuestionSchema).max(20).optional(),
    yesLabel: z.string().trim().min(1).max(40).optional(),
    noLabel: z.string().trim().min(1).max(40).optional(),
    prompt: z.string().trim().min(1).max(240).optional(),
    min: z.number().finite().optional(),
    max: z.number().finite().optional(),
    labels: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  })
  .passthrough()

export const assessmentRubricConfigSchema = z.union([
  scaleRubricConfigSchema,
  passFailRubricConfigSchema,
  measurementRubricConfigSchema,
  notesRubricConfigSchema,
  questionnaireRubricConfigSchema,
])

export const assessmentScoreDataSchema = z
  .object({
    left: z.union([z.number().finite(), z.boolean(), z.null()]).optional(),
    right: z.union([z.number().finite(), z.boolean(), z.null()]).optional(),
    observations: z.record(z.string(), z.boolean()).optional(),
    fields: z.record(z.string(), z.number().finite().nullable()).optional(),
    answers: z
      .record(z.string(), z.union([z.boolean(), z.number().finite(), z.null()]))
      .optional(),
    yesNo: z.boolean().nullable().optional(),
    text: z.string().max(2000).nullable().optional(),
    scale: z.number().finite().nullable().optional(),
    escalated: z.boolean().optional(),
  })
  .passthrough()

export type AssessmentScoreData = z.infer<typeof assessmentScoreDataSchema>

export const createAssessmentItemSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(120),
    category: z.enum(assessmentItemCategories).default('custom'),
    instructions: optionalText(1000),
    rubricType: z.enum(assessmentRubricTypes),
    rubricConfig: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .superRefine((value, ctx) => {
    const configResult = parseRubricConfig(value.rubricType, value.rubricConfig)
    if (!configResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: configResult.error,
        path: ['rubricConfig'],
      })
    }
  })

export type CreateAssessmentItemValues = z.infer<typeof createAssessmentItemSchema>

function hasBilateralValues(scoreData: AssessmentScoreData | undefined) {
  return (
    scoreData != null &&
    scoreData.left != null &&
    scoreData.right != null
  )
}

function hasObservationAnswers(
  scoreData: AssessmentScoreData | undefined,
  keys: string[]
) {
  if (!scoreData?.observations || keys.length === 0) return false
  return keys.every((key) => typeof scoreData.observations?.[key] === 'boolean')
}

function hasFieldAnswers(
  scoreData: AssessmentScoreData | undefined,
  keys: string[]
) {
  if (!scoreData?.fields || keys.length === 0) return false
  return keys.every(
    (key) =>
      typeof scoreData.fields?.[key] === 'number' &&
      Number.isFinite(scoreData.fields[key])
  )
}

export const assessmentResultInputSchema = z
  .object({
    clientKey: z.string().trim().min(1).max(80),
    assessmentItemId: z.string().uuid().nullable().optional(),
    itemName: z.string().trim().min(1).max(120),
    itemCategory: z.enum(assessmentItemCategories),
    rubricType: z.enum(assessmentRubricTypes),
    rubricConfig: z.record(z.string(), z.unknown()).optional().default({}),
    scaleScore: z.number().finite().nullable().optional(),
    passFail: z.boolean().nullable().optional(),
    measurementValue: z.number().finite().nullable().optional(),
    measurementUnit: optionalText(20),
    scoreData: assessmentScoreDataSchema.optional().default({}),
    notes: optionalText(2000),
    sortOrder: z.number().int().min(0).max(10_000).optional().default(0),
  })
  .superRefine((value, ctx) => {
    const configResult = parseRubricConfig(value.rubricType, value.rubricConfig)
    if (!configResult.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: configResult.error,
        path: ['rubricConfig'],
      })
      return
    }

    const config = configResult.config
    const scoreData = value.scoreData ?? {}
    const bilateral = config.bilateral === true
    const observationKeys = Array.isArray(config.observations)
      ? config.observations.filter((key): key is string => typeof key === 'string')
      : []
    const fieldKeys = Array.isArray(config.fields)
      ? config.fields
          .map((field) =>
            field && typeof field === 'object' && 'key' in field
              ? String((field as { key: unknown }).key)
              : null
          )
          .filter((key): key is string => Boolean(key))
      : []

    if (value.rubricType === 'scale') {
      const min = typeof config.min === 'number' ? config.min : 0
      const max = typeof config.max === 'number' ? config.max : 3

      if (bilateral) {
        if (!hasBilateralValues(scoreData)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Left and right scores are required.',
            path: ['scoreData'],
          })
          return
        }
        for (const side of ['left', 'right'] as const) {
          const sideScore = scoreData[side]
          if (typeof sideScore !== 'number' || sideScore < min || sideScore > max) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `${side} score must be between ${min} and ${max}.`,
              path: ['scoreData', side],
            })
          }
        }
        return
      }

      if (value.scaleScore == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Score is required.',
          path: ['scaleScore'],
        })
        return
      }
      if (value.scaleScore < min || value.scaleScore > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Score must be between ${min} and ${max}.`,
          path: ['scaleScore'],
        })
      }
      return
    }

    if (value.rubricType === 'pass_fail') {
      if (bilateral) {
        if (!hasBilateralValues(scoreData)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Left and right results are required.',
            path: ['scoreData'],
          })
        } else if (
          typeof scoreData.left !== 'boolean' ||
          typeof scoreData.right !== 'boolean'
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Left and right must be pass or fail.',
            path: ['scoreData'],
          })
        }
      } else if (observationKeys.length === 0 && value.passFail == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Pass/fail is required.',
          path: ['passFail'],
        })
      }

      if (
        observationKeys.length > 0 &&
        !hasObservationAnswers(scoreData, observationKeys)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mark each observation present or absent.',
          path: ['scoreData', 'observations'],
        })
      }
      return
    }

    if (value.rubricType === 'measurement') {
      if (fieldKeys.length > 0) {
        if (!hasFieldAnswers(scoreData, fieldKeys)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Enter all measurement fields.',
            path: ['scoreData', 'fields'],
          })
        }
        return
      }

      if (bilateral) {
        if (!hasBilateralValues(scoreData)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Left and right measurements are required.',
            path: ['scoreData'],
          })
          return
        }
        if (
          typeof scoreData.left !== 'number' ||
          typeof scoreData.right !== 'number'
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Left and right must be numbers.',
            path: ['scoreData'],
          })
        }
        return
      }

      if (value.measurementValue == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Measurement is required.',
          path: ['measurementValue'],
        })
      }
      return
    }

    if (value.rubricType === 'questionnaire') {
      const mode =
        typeof config.mode === 'string' ? config.mode : 'yes_no_text'

      if (mode === 'multi_yes_no') {
        const questions = Array.isArray(config.questions)
          ? config.questions
          : []
        const ids = questions
          .map((question) =>
            question && typeof question === 'object' && 'id' in question
              ? String((question as { id: unknown }).id)
              : null
          )
          .filter((id): id is string => Boolean(id))

        if (
          ids.length === 0 ||
          !ids.every((id) => typeof scoreData.answers?.[id] === 'boolean')
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Answer every yes/no question.',
            path: ['scoreData', 'answers'],
          })
        }
        return
      }

      if (mode === 'yes_no_text') {
        if (typeof scoreData.yesNo !== 'boolean') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Select yes or no.',
            path: ['scoreData', 'yesNo'],
          })
        }
        return
      }

      if (mode === 'scale_text') {
        const min = typeof config.min === 'number' ? config.min : 1
        const max = typeof config.max === 'number' ? config.max : 5
        if (
          typeof scoreData.scale !== 'number' ||
          scoreData.scale < min ||
          scoreData.scale > max
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Select a rating between ${min} and ${max}.`,
            path: ['scoreData', 'scale'],
          })
        }
      }
      return
    }

    // notes rubric: notes or media are enough; empty notes alone is allowed
  })

export type AssessmentResultInputValues = z.infer<typeof assessmentResultInputSchema>

export const saveClientAssessmentSchema = z.object({
  clientId: z.string().uuid(),
  assessmentId: z.string().uuid().nullable().optional(),
  title: optionalText(160),
  assessedAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
  overallNotes: optionalText(4000),
  source: z.enum(['manual', 'onboarding']).optional().default('manual'),
  results: z.array(assessmentResultInputSchema).max(100),
})

export type SaveClientAssessmentValues = z.infer<typeof saveClientAssessmentSchema>

export const teamAssessmentSessionItemInputSchema = z.object({
  assessmentItemId: z.string().uuid().nullable().optional(),
  itemName: z.string().trim().min(1).max(120),
  itemCategory: z.enum(assessmentItemCategories),
  rubricType: z.enum(assessmentRubricTypes),
  rubricConfig: z.record(z.string(), z.unknown()).optional().default({}),
  sortOrder: z.number().int().min(0).max(10_000).optional().default(0),
})

export type TeamAssessmentSessionItemInputValues = z.infer<
  typeof teamAssessmentSessionItemInputSchema
>

export const createTeamAssessmentSessionSchema = z.object({
  teamId: z.string().uuid(),
  title: optionalText(160),
  assessedAt: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
  items: z
    .array(teamAssessmentSessionItemInputSchema)
    .min(1, 'Select at least one test.')
    .max(100),
})

export type CreateTeamAssessmentSessionValues = z.infer<
  typeof createTeamAssessmentSessionSchema
>

export const saveTeamAssessmentResultSchema = z.object({
  sessionId: z.string().uuid(),
  clientId: z.string().uuid(),
  result: assessmentResultInputSchema,
})

export type SaveTeamAssessmentResultValues = z.infer<
  typeof saveTeamAssessmentResultSchema
>

export function parseRubricConfig(
  rubricType: (typeof assessmentRubricTypes)[number],
  config: unknown
):
  | {
      success: true
      config: Record<string, unknown> & {
        min?: number
        max?: number
        unit?: string
        bilateral?: boolean
        observations?: string[]
        fields?: Array<{ key: string; label: string; unit?: string }>
        mode?: string
        questions?: Array<{ id: string; text: string }>
      }
    }
  | { success: false; error: string } {
  const value = config ?? {}

  if (rubricType === 'scale') {
    const parsed = scaleRubricConfigSchema.safeParse(value)
    if (!parsed.success) {
      return { success: false, error: 'Scale rubric needs min and max values.' }
    }
    if (parsed.data.min > parsed.data.max) {
      return { success: false, error: 'Scale min cannot be greater than max.' }
    }
    return { success: true, config: parsed.data }
  }

  if (rubricType === 'pass_fail') {
    const parsed = passFailRubricConfigSchema.safeParse(value)
    if (!parsed.success) {
      return { success: false, error: 'Invalid pass/fail rubric.' }
    }
    return { success: true, config: parsed.data }
  }

  if (rubricType === 'measurement') {
    const parsed = measurementRubricConfigSchema.safeParse(value)
    if (!parsed.success) {
      return { success: false, error: 'Measurement rubric needs a unit.' }
    }
    return { success: true, config: parsed.data }
  }

  if (rubricType === 'questionnaire') {
    const parsed = questionnaireRubricConfigSchema.safeParse(value)
    if (!parsed.success) {
      return { success: false, error: 'Invalid questionnaire rubric.' }
    }
    if (parsed.data.mode === 'multi_yes_no' && !parsed.data.questions?.length) {
      return {
        success: false,
        error: 'Questionnaire needs at least one question.',
      }
    }
    return { success: true, config: parsed.data }
  }

  const parsed = notesRubricConfigSchema.safeParse(value)
  if (!parsed.success) {
    return { success: false, error: 'Invalid notes rubric.' }
  }
  return { success: true, config: parsed.data }
}

export function defaultRubricConfig(
  rubricType: (typeof assessmentRubricTypes)[number]
): Record<string, unknown> {
  switch (rubricType) {
    case 'scale':
      return {
        min: 0,
        max: 3,
        labels: ['Pain', 'Cannot complete', 'Compensation', 'Perfect'],
        painFlag: true,
      }
    case 'pass_fail':
      return { passLabel: 'Pass', failLabel: 'Fail' }
    case 'measurement':
      return { unit: 'units', higherIsBetter: true }
    case 'questionnaire':
      return {
        mode: 'yes_no_text',
        yesLabel: 'Yes',
        noLabel: 'No',
        prompt: 'Any relevant history to note?',
      }
    case 'notes':
      return {}
  }
}

export function normalizeScoreDataForSave(input: {
  rubricType: (typeof assessmentRubricTypes)[number]
  rubricConfig: Record<string, unknown>
  scaleScore?: number | null
  passFail?: boolean | null
  measurementValue?: number | null
  scoreData?: AssessmentScoreData
}): {
  scaleScore: number | null
  passFail: boolean | null
  measurementValue: number | null
  scoreData: AssessmentScoreData
} {
  const config = input.rubricConfig
  const scoreData: AssessmentScoreData = { ...(input.scoreData ?? {}) }
  const bilateral = config.bilateral === true
  const observationKeys = Array.isArray(config.observations)
    ? config.observations.filter((key): key is string => typeof key === 'string')
    : []
  const fieldDefs = Array.isArray(config.fields) ? config.fields : []

  if (input.rubricType === 'scale') {
    if (bilateral && typeof scoreData.left === 'number' && typeof scoreData.right === 'number') {
      return {
        scaleScore: Math.min(scoreData.left, scoreData.right),
        passFail: null,
        measurementValue: null,
        scoreData: { left: scoreData.left, right: scoreData.right },
      }
    }
    return {
      scaleScore: input.scaleScore ?? null,
      passFail: null,
      measurementValue: null,
      scoreData: {},
    }
  }

  if (input.rubricType === 'pass_fail') {
    if (bilateral && typeof scoreData.left === 'boolean' && typeof scoreData.right === 'boolean') {
      const observations =
        observationKeys.length > 0 && scoreData.observations
          ? Object.fromEntries(
              observationKeys.map((key) => [
                key,
                Boolean(scoreData.observations?.[key]),
              ])
            )
          : undefined
      return {
        scaleScore: null,
        passFail: scoreData.left && scoreData.right,
        measurementValue: null,
        scoreData: {
          left: scoreData.left,
          right: scoreData.right,
          ...(observations ? { observations } : {}),
        },
      }
    }

    if (observationKeys.length > 0 && scoreData.observations) {
      const observations = Object.fromEntries(
        observationKeys.map((key) => [
          key,
          Boolean(scoreData.observations?.[key]),
        ])
      )
      const hasDeviation = Object.values(observations).some(Boolean)
      return {
        scaleScore: null,
        passFail: !hasDeviation,
        measurementValue: null,
        scoreData: { observations },
      }
    }

    return {
      scaleScore: null,
      passFail: input.passFail ?? null,
      measurementValue: null,
      scoreData: {},
    }
  }

  if (input.rubricType === 'measurement') {
    if (fieldDefs.length > 0) {
      const fields: Record<string, number | null> = {}
      for (const field of fieldDefs) {
        if (!field || typeof field !== 'object' || !('key' in field)) continue
        const key = String((field as { key: unknown }).key)
        const value = scoreData.fields?.[key]
        fields[key] = typeof value === 'number' ? value : null
      }
      const firstValue = Object.values(fields).find(
        (value): value is number => typeof value === 'number'
      )
      return {
        scaleScore: null,
        passFail: null,
        measurementValue: firstValue ?? null,
        scoreData: { fields },
      }
    }

    if (
      bilateral &&
      typeof scoreData.left === 'number' &&
      typeof scoreData.right === 'number'
    ) {
      return {
        scaleScore: null,
        passFail: null,
        measurementValue: (scoreData.left + scoreData.right) / 2,
        scoreData: { left: scoreData.left, right: scoreData.right },
      }
    }

    return {
      scaleScore: null,
      passFail: null,
      measurementValue: input.measurementValue ?? null,
      scoreData: {},
    }
  }

  if (input.rubricType === 'questionnaire') {
    const mode = typeof config.mode === 'string' ? config.mode : 'yes_no_text'
    if (mode === 'multi_yes_no') {
      const answers = scoreData.answers ?? {}
      const escalated =
        config.escalateOnYes === true &&
        Object.values(answers).some((answer) => answer === true)
      return {
        scaleScore: null,
        passFail: null,
        measurementValue: null,
        scoreData: { answers, escalated },
      }
    }
    if (mode === 'yes_no_text') {
      return {
        scaleScore: null,
        passFail: null,
        measurementValue: null,
        scoreData: {
          yesNo: scoreData.yesNo ?? null,
          text: scoreData.text ?? null,
        },
      }
    }
    return {
      scaleScore: null,
      passFail: null,
      measurementValue: null,
      scoreData: {
        scale: scoreData.scale ?? null,
        text: scoreData.text ?? null,
      },
    }
  }

  return {
    scaleScore: null,
    passFail: null,
    measurementValue: null,
    scoreData: {},
  }
}
