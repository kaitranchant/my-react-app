'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updatePortalNotificationPreference } from '@/app/portal/account/actions'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  SettingsSavedIndicator,
  useSettingsSavedIndicator,
} from '@/components/settings/settings-saved-indicator'
import { SettingsToggle } from '@/components/settings/settings-toggle'
import type { PortalNotificationPreferences } from '@/lib/portal-notification-preferences'
import type { PortalNotificationPreferenceKey } from '@/lib/validations/portal-notification-preferences'

type NotificationOption = {
  key: PortalNotificationPreferenceKey
  label: string
  description: string
}

const notificationOptions: NotificationOption[] = [
  {
    key: 'notifyCoachMessages',
    label: 'Messages from your coach',
    description:
      'Email when your coach sends you a message in the portal.',
  },
  {
    key: 'notifyCheckInReviews',
    label: 'Check-in feedback',
    description:
      'Email when your coach reviews your check-in and leaves feedback.',
  },
  {
    key: 'notifyFormReviewReplies',
    label: 'Form review feedback',
    description:
      'Email when your coach replies to a photo or video you submitted.',
  },
  {
    key: 'notifyTeamUpdates',
    label: 'Team announcements and events',
    description:
      'Email when your team has a new announcement or event update.',
  },
  {
    key: 'notifyWorkoutReminders',
    label: 'Workout reminders',
    description:
      'Email on days you have a scheduled workout that you have not started yet.',
  },
  {
    key: 'notifyCheckInReminders',
    label: 'Check-in reminders',
    description:
      'Email when a check-in is due based on your coach\u2019s cadence.',
  },
  {
    key: 'notifyUnreadDigest',
    label: 'Unread message digest',
    description:
      'Daily email when you have unread messages from your coach.',
  },
]

export function PortalNotificationSettings({
  defaultValues,
  emailDeliveryEnabled = false,
}: {
  defaultValues: PortalNotificationPreferences
  emailDeliveryEnabled?: boolean
}) {
  const [values, setValues] = React.useState(defaultValues)
  const [pendingKey, setPendingKey] =
    React.useState<PortalNotificationPreferenceKey | null>(null)
  const { savedKey, markSaved } = useSettingsSavedIndicator()

  React.useEffect(() => {
    setValues(defaultValues)
  }, [defaultValues])

  async function onToggle(key: PortalNotificationPreferenceKey, checked: boolean) {
    const previous = values[key]
    setValues((current) => ({ ...current, [key]: checked }))
    setPendingKey(key)

    const result = await updatePortalNotificationPreference(key, checked)
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
            !emailDeliveryEnabled
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
