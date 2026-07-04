import { z } from 'zod'

export const coachTaskPriorities = ['low', 'normal', 'high'] as const
export type CoachTaskPriority = (typeof coachTaskPriorities)[number]

export const coachTaskStatuses = ['pending', 'completed'] as const
export type CoachTaskStatus = (typeof coachTaskStatuses)[number]

export const coachTaskFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter a task title.').max(200),
  details: z.string().trim().max(2000).optional().or(z.literal('')),
  dueDate: z.string().trim().optional().or(z.literal('')),
  priority: z.enum(coachTaskPriorities).default('normal'),
  clientId: z.string().uuid().optional().or(z.literal('')),
})

export type CoachTaskFormValues = z.infer<typeof coachTaskFormSchema>

export const coachTaskIdSchema = z.object({
  taskId: z.string().uuid(),
})

export const coachTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(coachTaskStatuses),
})

export function parseCoachTaskDueDate(value: string | undefined): string | null {
  if (!value?.trim()) return null
  const parsed = z.string().date().safeParse(value.trim())
  return parsed.success ? parsed.data : null
}
