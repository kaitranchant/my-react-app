import { z } from 'zod'

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, 'Message cannot be empty.')
  .max(4000, 'Message must be 4,000 characters or fewer.')

export const messageCaptionSchema = z
  .string()
  .trim()
  .max(500, 'Caption must be 500 characters or fewer.')

export const broadcastRecipientsSchema = z
  .array(z.string().uuid())
  .min(1, 'Select at least one client.')
  .max(100, 'You can broadcast to at most 100 clients at once.')

export type MessageBodyValues = z.infer<typeof messageBodySchema>
