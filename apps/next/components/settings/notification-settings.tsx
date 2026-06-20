import { Badge } from '@/components/ui/badge'
import { SettingsRow } from '@/components/settings/settings-row'
import { SettingsToggle } from '@/components/settings/settings-toggle'

const notificationOptions = [
  {
    id: 'check-ins',
    label: 'New client check-ins',
    description: 'Get notified when a client submits a check-in for review.',
    defaultChecked: true,
  },
  {
    id: 'workouts',
    label: 'Workout completions',
    description: 'Get notified when a client finishes a scheduled workout.',
    defaultChecked: true,
  },
  {
    id: 'missed',
    label: 'Missed sessions',
    description: 'Daily digest of clients who skipped scheduled workouts.',
    defaultChecked: false,
  },
  {
    id: 'invites',
    label: 'Client invite accepted',
    description: 'Get notified when a pending invite is accepted.',
    defaultChecked: true,
  },
  {
    id: 'summary',
    label: 'Weekly summary email',
    description: 'A Monday morning recap of client activity and action items.',
    defaultChecked: false,
  },
] as const

export function NotificationSettings() {
  return (
    <div>
      {notificationOptions.map((option) => (
        <SettingsRow
          key={option.id}
          label={option.label}
          description={option.description}
        >
          <div className="flex items-center gap-2">
            <SettingsToggle
              checked={option.defaultChecked}
              disabled
              label={option.label}
            />
            <Badge variant="outline" className="text-[10px] font-normal">
              Soon
            </Badge>
          </div>
        </SettingsRow>
      ))}
    </div>
  )
}
