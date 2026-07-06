'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updateCoachClientNotificationPreference } from '@/app/(dashboard)/settings/actions'
import { SettingsSubsection } from '@/components/settings/settings-subsection'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  SettingsSavedIndicator,
  useSettingsSavedIndicator,
} from '@/components/settings/settings-saved-indicator'
import { SettingsToggle } from '@/components/settings/settings-toggle'
import type { CoachClientNotificationPreferences } from '@/lib/coach-client-notification-preferences'
import type { CoachClientNotificationPreferenceKey } from '@/lib/validations/coach-client-notification-preferences'

type NotificationOption = {
  key: CoachClientNotificationPreferenceKey
  label: string
  description: string
  email?: boolean
}

const notificationOptions: NotificationOption[] = [
  {
    key: 'sendClientMessages',
    label: 'Messages',
    description:
      'Email and push when you send a direct message, broadcast, or appointment update.',
    email: true,
  },
  {
    key: 'sendClientCheckInReviews',
    label: 'Check-in feedback',
    description:
      'Email and push when you review a client check-in and leave feedback.',
    email: true,
  },
  {
    key: 'sendClientFormReviewReplies',
    label: 'Form review feedback',
    description:
      'Email and push when you reply to a client photo or video submission.',
    email: true,
  },
  {
    key: 'sendClientNutritionSetup',
    label: 'Nutrition setup forms',
    description:
      'Email and push when you send a client a nutrition setup form to complete.',
    email: true,
  },
  {
    key: 'sendClientTeamUpdates',
    label: 'Team announcements and forum posts',
    description:
      'Email when you post a team announcement or community forum update.',
    email: true,
  },
  {
    key: 'sendClientInvites',
    label: 'Portal invites',
    description:
      'Email when you invite a client to create their portal account.',
    email: true,
  },
  {
    key: 'sendClientOnboardingDocuments',
    label: 'Onboarding documents',
    description:
      'Email when you send PAR-Q, liability, or other onboarding documents to sign.',
    email: true,
  },
  {
    key: 'sendClientWorkoutReminders',
    label: 'Workout reminders',
    description:
      'Automated email and push on days a client has a scheduled workout they have not started.',
    email: true,
  },
  {
    key: 'sendClientCheckInReminders',
    label: 'Check-in reminders',
    description:
      'Automated email and push when a check-in is due based on your cadence.',
    email: true,
  },
  {
    key: 'sendClientUnreadDigest',
    label: 'Unread message digest',
    description:
      'Daily automated email when a client has unread messages from you.',
    email: true,
  },
  {
    key: 'sendClientAppointmentReminders',
    label: 'Session reminders',
    description:
      'Automated email and push before scheduled coaching sessions.',
    email: true,
  },
]

export function CoachClientNotificationSettings({
  defaultValues,
  emailDeliveryEnabled = false,
}: {
  defaultValues: CoachClientNotificationPreferences
  emailDeliveryEnabled?: boolean
}) {
  const [values, setValues] = React.useState(defaultValues)
  const [pendingKey, setPendingKey] =
    React.useState<CoachClientNotificationPreferenceKey | null>(null)
  const { savedKey, markSaved } = useSettingsSavedIndicator()

  React.useEffect(() => {
    setValues(defaultValues)
  }, [defaultValues])

  async function onToggle(
    key: CoachClientNotificationPreferenceKey,
    checked: boolean
  ) {
    const previous = values[key]
    setValues((current) => ({ ...current, [key]: checked }))
    setPendingKey(key)

    const result = await updateCoachClientNotificationPreference(key, checked)
    setPendingKey(null)

    if (result.success) {
      markSaved(key)
      return
    }

    setValues((current) => ({ ...current, [key]: previous }))
    toast.error(result.error)
  }

  return (
    <SettingsSubsection
      variant="panel"
      title="Notifications to clients"
      description="Choose which emails and push alerts your clients receive from you. Clients can also manage their own preferences in the portal."
    >
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
    </SettingsSubsection>
  )
}
