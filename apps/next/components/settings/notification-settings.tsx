'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updateNotificationPreference } from '@/app/(dashboard)/settings/actions'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  SettingsSavedIndicator,
  useSettingsSavedIndicator,
} from '@/components/settings/settings-saved-indicator'
import { SettingsToggle } from '@/components/settings/settings-toggle'
import type { NotificationPreferences } from '@/lib/notification-preferences'
import type { NotificationPreferenceKey } from '@/lib/validations/notification-preferences'

type NotificationOption = {
  key: NotificationPreferenceKey
  label: string
  description: string
  email?: boolean
}

const notificationOptions: NotificationOption[] = [
  {
    key: 'notifyCheckIns',
    label: 'New client check-ins',
    description:
      'Show check-in submissions on your dashboard and in the activity feed.',
  },
  {
    key: 'notifyFormReviews',
    label: 'New form review submissions',
    description:
      'Email and dashboard alerts when a client submits a photo or video for form review.',
    email: true,
  },
  {
    key: 'notifyWorkoutCompletions',
    label: 'Workout completions',
    description:
      'Show completed workouts on your dashboard activity feed.',
  },
  {
    key: 'notifyMissedSessions',
    label: 'Missed sessions',
    description:
      'Highlight skipped workouts and clients without logged sessions this week.',
  },
  {
    key: 'notifyInviteAccepted',
    label: 'Client invite accepted',
    description:
      'Email when a client accepts their portal invite, plus pending-invite highlights on your dashboard.',
    email: true,
  },
  {
    key: 'notifyPrs',
    label: 'Client personal records',
    description:
      'Email when a client sets a new PR during a workout.',
    email: true,
  },
  {
    key: 'notifyWeeklySummary',
    label: 'Weekly summary email',
    description:
      'Receive a Sunday morning recap of client activity and action items.',
    email: true,
  },
]

export function NotificationSettings({
  defaultValues,
  emailDeliveryEnabled = false,
}: {
  defaultValues: NotificationPreferences
  emailDeliveryEnabled?: boolean
}) {
  const [values, setValues] = React.useState(defaultValues)
  const [pendingKey, setPendingKey] =
    React.useState<NotificationPreferenceKey | null>(null)
  const { savedKey, markSaved } = useSettingsSavedIndicator()

  React.useEffect(() => {
    setValues(defaultValues)
  }, [defaultValues])

  async function onToggle(key: NotificationPreferenceKey, checked: boolean) {
    const previous = values[key]
    setValues((current) => ({ ...current, [key]: checked }))
    setPendingKey(key)

    const result = await updateNotificationPreference(key, checked)
    setPendingKey(null)

    if (result.success) {
      markSaved(key)
      return
    }

    setValues((current) => ({ ...current, [key]: previous }))
    toast.error(result.error)
  }

  return (
    <div>
      {notificationOptions.map((option) => (
        <SettingsRow
          key={option.key}
          label={option.label}
          description={
            option.email && !emailDeliveryEnabled
              ? `${option.description} Email delivery is not enabled yet; your preference is saved for when it is.`
              : option.description
          }
        >
          <div className="flex items-center gap-2">
            <SettingsSavedIndicator visible={savedKey === option.key} />
            <SettingsToggle
              checked={values[option.key]}
              disabled={pendingKey === option.key}
              onCheckedChange={(checked) => onToggle(option.key, checked)}
              label={option.label}
            />
          </div>
        </SettingsRow>
      ))}
    </div>
  )
}
