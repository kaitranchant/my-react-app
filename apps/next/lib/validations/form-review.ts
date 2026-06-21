import { z } from 'zod'

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.literal(''), z.null()])
    .optional()
    .transform((value) =>
      value === '' || value === undefined || value === null ? null : value
    )

export const formReviewUploadSchema = z.object({
  title: optionalText(120),
  clientNotes: optionalText(500),
  exerciseId: z
    .union([z.string().uuid(), z.literal('none'), z.literal(''), z.null()])
    .optional()
    .transform((value) =>
      value === '' || value === undefined || value === null || value === 'none'
        ? null
        : value
    ),
  scheduledWorkoutId: z
    .union([z.string().uuid(), z.literal(''), z.null()])
    .optional()
    .transform((value) =>
      value === '' || value === undefined || value === null ? null : value
    ),
  scheduledExerciseId: z
    .union([z.string().uuid(), z.literal(''), z.null()])
    .optional()
    .transform((value) =>
      value === '' || value === undefined || value === null ? null : value
    ),
})

export type FormReviewUploadValues = z.infer<typeof formReviewUploadSchema>

export const formReviewFeedbackSchema = z.object({
  coachFeedback: optionalText(2000),
})

export type FormReviewFeedbackValues = z.infer<typeof formReviewFeedbackSchema>
