import { z } from 'zod'

export const dashboardSectionKeys = [
  'quickActions',
  'stats',
  'gettingStarted',
  'proactiveAlerts',
  'highPriorityTasks',
  'todaysSchedule',
  'actionItems',
  'recentActivity',
] as const

export type DashboardSectionKey = (typeof dashboardSectionKeys)[number]

export const dashboardPreferencesSchema = z.object({
  quickActions: z.boolean(),
  stats: z.boolean(),
  gettingStarted: z.boolean(),
  proactiveAlerts: z.boolean(),
  highPriorityTasks: z.boolean(),
  todaysSchedule: z.boolean(),
  actionItems: z.boolean(),
  recentActivity: z.boolean(),
})

export type DashboardPreferencesValues = z.infer<
  typeof dashboardPreferencesSchema
>
