import { z } from 'zod'

import { clientGymIdSchema } from '@/lib/validations/client'

export const teamFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name is too long'),
  description: z.string().trim().max(2000, 'Description is too long').optional(),
  nextCompetitionName: z.string().trim().max(120, 'Name is too long').optional(),
  nextCompetitionDate: z.string().optional(),
  gymId: clientGymIdSchema.optional(),
})

export type TeamFormValues = z.infer<typeof teamFormSchema>

export const teamFormDefaults: TeamFormValues = {
  name: '',
  description: '',
  nextCompetitionName: '',
  nextCompetitionDate: '',
  gymId: 'none',
}

export const teamEventTypes = [
  'practice',
  'check_in',
  'mock_meet',
  'competition',
  'other',
] as const

export type TeamEventTypeValue = (typeof teamEventTypes)[number]

export const teamEventFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Title is too long'),
  eventType: z.enum(teamEventTypes),
  eventDate: z.string().min(1, 'Date is required'),
  startTime: z.string().optional(),
  location: z.string().trim().max(200, 'Location is too long').optional(),
  notes: z.string().trim().max(2000, 'Notes are too long').optional(),
})

export type TeamEventFormValues = z.infer<typeof teamEventFormSchema>

export const teamAnnouncementSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Announcement cannot be empty')
    .max(2000, 'Announcement is too long'),
  pinned: z.boolean().optional(),
})

export type TeamAnnouncementValues = z.infer<typeof teamAnnouncementSchema>

export const teamEventRsvpStatuses = [
  'going',
  'maybe',
  'declined',
  'no_response',
] as const

export const teamEventAttendanceStatuses = [
  'present',
  'late',
  'absent',
  'excused',
] as const

export const updateTeamEventMemberStatusSchema = z.object({
  clientId: z.string().uuid(),
  rsvpStatus: z.enum(teamEventRsvpStatuses).optional(),
  attendanceStatus: z.enum(teamEventAttendanceStatuses).nullable().optional(),
})

export type UpdateTeamEventMemberStatusValues = z.infer<
  typeof updateTeamEventMemberStatusSchema
>

export const memberStartDateModes = ['team_start', 'today', 'custom'] as const

export type MemberStartDateMode = (typeof memberStartDateModes)[number]

export const addTeamMemberSchema = z
  .object({
    clientId: z.string().uuid('Select a client'),
    startDateMode: z.enum(memberStartDateModes).optional(),
    customStartDate: z.string().optional(),
  })
  .refine(
    (value) =>
      value.startDateMode !== 'custom' ||
      (value.customStartDate?.trim()?.length ?? 0) > 0,
    {
      message: 'Enter a start date.',
      path: ['customStartDate'],
    }
  )

export type AddTeamMemberValues = z.infer<typeof addTeamMemberSchema>

export const removeTeamMemberSchema = z.object({
  unassignProgram: z.boolean(),
})

export type RemoveTeamMemberValues = z.infer<typeof removeTeamMemberSchema>

export const assignProgramToTeamSchema = z.object({
  programId: z.string().uuid('Select a program'),
  startDate: z.string().optional(),
})

export type AssignProgramToTeamValues = z.infer<typeof assignProgramToTeamSchema>

export const teamPowerliftingExerciseIdSchema = z
  .string()
  .uuid()
  .or(z.literal('none'))

export const teamPowerliftingExercisesSchema = z.object({
  squatExerciseId: teamPowerliftingExerciseIdSchema,
  benchExerciseId: teamPowerliftingExerciseIdSchema,
  deadliftExerciseId: teamPowerliftingExerciseIdSchema,
})

export type TeamPowerliftingExercisesValues = z.infer<
  typeof teamPowerliftingExercisesSchema
>

export const unassignProgramFromTeamSchema = z.object({
  unassignMembers: z.boolean(),
})

export type UnassignProgramFromTeamValues = z.infer<
  typeof unassignProgramFromTeamSchema
>

export const teamChallengeMetrics = [
  'strength',
  'relative_strength',
  'consistency',
  'volume',
  'most_improved',
] as const

export type TeamChallengeMetricValue = (typeof teamChallengeMetrics)[number]

export const teamChallengeFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(120, 'Name is too long'),
    description: z.string().trim().max(2000, 'Description is too long').optional(),
    metric: z.enum(teamChallengeMetrics),
    exerciseId: z.string().uuid().or(z.literal('none')).optional(),
    formula: z.enum(['dots', 'wilks']).optional(),
    weightClassFilter: z.string().trim().max(80).optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: 'End date must be on or after the start date.',
    path: ['endDate'],
  })
  .superRefine((value, ctx) => {
    const needsExercise =
      value.metric === 'strength' || value.metric === 'most_improved'
    if (needsExercise && (!value.exerciseId || value.exerciseId === 'none')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select an exercise for this challenge metric.',
        path: ['exerciseId'],
      })
    }
  })

export type TeamChallengeFormValues = z.infer<typeof teamChallengeFormSchema>
