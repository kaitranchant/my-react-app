import type { Json } from 'app/types/database'
import {
  dashboardSectionKeys,
  type DashboardPreferencesValues,
  type DashboardSectionKey,
} from '@/lib/validations/dashboard-preferences'

export type DashboardPreferences = DashboardPreferencesValues

export const defaultDashboardPreferences: DashboardPreferences = {
  quickActions: true,
  stats: true,
  gettingStarted: true,
  proactiveAlerts: true,
  highPriorityTasks: true,
  todaysSchedule: true,
  actionItems: true,
  recentActivity: true,
}

export const dashboardSectionOptions: Array<{
  key: DashboardSectionKey
  label: string
  description: string
}> = [
  {
    key: 'quickActions',
    label: 'Quick actions',
    description: 'Add client, open a calendar, and schedule a session from the greeting.',
  },
  {
    key: 'stats',
    label: 'Stats overview',
    description: 'Session completion, active clients, and client status counts.',
  },
  {
    key: 'gettingStarted',
    label: 'Getting started checklist',
    description: 'Onboarding checklist for new coaches until setup is complete.',
  },
  {
    key: 'proactiveAlerts',
    label: 'Proactive alerts',
    description: 'Load, injury, and check-in alerts that need a closer look.',
  },
  {
    key: 'highPriorityTasks',
    label: 'High priority tasks',
    description: 'Open high-priority tasks from your scheduling to-do list.',
  },
  {
    key: 'todaysSchedule',
    label: "Today's schedule",
    description: 'Sessions on your calendar for today.',
  },
  {
    key: 'actionItems',
    label: 'Needs your attention',
    description: 'Follow-ups like invites, check-ins, and clients to nudge.',
  },
  {
    key: 'recentActivity',
    label: 'Recent activity',
    description: 'Sessions, check-ins, form reviews, and nutrition setup.',
  },
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseDashboardPreferences(
  value?: Json | null
): DashboardPreferences {
  if (!isPlainObject(value)) {
    return { ...defaultDashboardPreferences }
  }

  const parsed = { ...defaultDashboardPreferences }
  for (const key of dashboardSectionKeys) {
    if (typeof value[key] === 'boolean') {
      parsed[key] = value[key]
    }
  }
  return parsed
}

export function dashboardPreferencesToRow(
  values: DashboardPreferences
): { dashboard_section_visibility: Json } {
  return {
    dashboard_section_visibility: values,
  }
}
