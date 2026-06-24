import { z } from 'zod'

export const forumPostBodySchema = z
  .string()
  .trim()
  .min(1, 'Post cannot be empty.')
  .max(4000, 'Post must be 4,000 characters or fewer.')

export const forumReplyBodySchema = z
  .string()
  .trim()
  .min(1, 'Reply cannot be empty.')
  .max(2000, 'Reply must be 2,000 characters or fewer.')

export type ForumPostBodyValues = z.infer<typeof forumPostBodySchema>
export type ForumReplyBodyValues = z.infer<typeof forumReplyBodySchema>
