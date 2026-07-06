import { z } from 'zod'

export const onboardingDocumentTypes = ['par_q', 'liability', 'other'] as const

export const onboardingDeliveryMethods = ['email', 'in_person'] as const

export const uploadOnboardingDocumentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  documentType: z.enum(onboardingDocumentTypes),
  isDefault: z.boolean().optional(),
})

export type UploadOnboardingDocumentValues = z.infer<
  typeof uploadOnboardingDocumentSchema
>

export const createOnboardingPacketSchema = z.object({
  clientId: z.string().uuid(),
  documentIds: z.array(z.string().uuid()).min(1, 'Select at least one document'),
  deliveryMethod: z.enum(onboardingDeliveryMethods),
  signerEmail: z.string().email().optional(),
})

export type CreateOnboardingPacketValues = z.infer<
  typeof createOnboardingPacketSchema
>

export const completeDocumentSignSchema = z.object({
  token: z.string().uuid().optional(),
  packetId: z.string().uuid().optional(),
  requestId: z.string().uuid(),
  signerName: z.string().trim().min(1, 'Full name is required').max(200),
  signerEmail: z.string().email().optional(),
  consent: z.literal(true, { message: 'You must agree to sign this document' }),
})

export type CompleteDocumentSignValues = z.infer<typeof completeDocumentSignSchema>
