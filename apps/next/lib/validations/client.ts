import { z } from 'zod'

export const clientStatuses = ['active', 'paused', 'archived'] as const

export const clientCoachingTypes = ['online', 'in_person', 'hybrid'] as const

export const clientFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name is too long'),
  email: z
    .union([z.string().trim().email('Enter a valid email'), z.literal('')])
    .optional(),
  phone: z.string().trim().max(40, 'Phone is too long').optional(),
  status: z.enum(clientStatuses),
  coachingType: z
    .union([z.enum(clientCoachingTypes), z.literal('none')])
    .optional(),
  goal: z.string().trim().max(500, 'Goal is too long').optional(),
  notes: z.string().trim().max(2000, 'Notes are too long').optional(),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>

export const clientNotesSchema = z
  .string()
  .trim()
  .max(2000, 'Notes are too long')

export const clientFormDefaults: ClientFormValues = {
  fullName: '',
  email: '',
  phone: '',
  status: 'active',
  coachingType: 'none',
  goal: '',
  notes: '',
}

export const inviteClientSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(120, 'Name is too long'),
  email: z.string().trim().email('Enter a valid email'),
  coachingType: z
    .union([z.enum(clientCoachingTypes), z.literal('none')])
    .optional(),
  goal: z.string().trim().max(500, 'Goal is too long').optional(),
})

export type InviteClientValues = z.infer<typeof inviteClientSchema>

export const inviteClientDefaults: InviteClientValues = {
  fullName: '',
  email: '',
  coachingType: 'none',
  goal: '',
}
