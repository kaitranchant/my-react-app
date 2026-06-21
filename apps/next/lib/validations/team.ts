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

export const unassignProgramFromTeamSchema = z.object({
  unassignMembers: z.boolean(),
})

export type UnassignProgramFromTeamValues = z.infer<
  typeof unassignProgramFromTeamSchema
>
