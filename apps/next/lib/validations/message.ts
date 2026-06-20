import { z } from 'zod'

export const messageBodySchema = z
  .string()
  .trim()
  .min(1, 'Message cannot be empty.')
  .max(4000, 'Message must be 4,000 characters or fewer.')

export type MessageBodyValues = z.infer<typeof messageBodySchema>
