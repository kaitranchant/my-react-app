'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updateOnboardingMilestoneIncluded } from '@/app/(dashboard)/settings/actions'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  SettingsSavedIndicator,
  useSettingsSavedIndicator,
} from '@/components/settings/settings-saved-indicator'
import { SettingsSubsection } from '@/components/settings/settings-subsection'
import { SettingsToggle } from '@/components/settings/settings-toggle'
import {
  CLIENT_ONBOARDING_MILESTONE_OPTIONS,
  isOnboardingMilestoneIncluded,
  serializeOnboardingMilestoneTemplate,
  type ClientOnboardingMilestoneKey,
  type ClientOnboardingMilestoneTemplate,
} from '@/lib/client-onboarding'

type OnboardingMilestoneTemplateSettingsProps = {
  defaultTemplate: ClientOnboardingMilestoneTemplate
}

export function OnboardingMilestoneTemplateSettings({
  defaultTemplate,
}: OnboardingMilestoneTemplateSettingsProps) {
  const [template, setTemplate] = React.useState(() =>
    serializeOnboardingMilestoneTemplate(defaultTemplate)
  )
  const [pendingKey, setPendingKey] =
    React.useState<ClientOnboardingMilestoneKey | null>(null)
  const { savedKey, markSaved } = useSettingsSavedIndicator()

  React.useEffect(() => {
    setTemplate(serializeOnboardingMilestoneTemplate(defaultTemplate))
  }, [defaultTemplate])

  async function handleToggle(
    key: ClientOnboardingMilestoneKey,
    included: boolean
  ) {
    const previous = template
    const next = { ...template, [key]: included }
    const includedCount = Object.values(next).filter(Boolean).length

    if (includedCount === 0) {
      toast.error('Keep at least one onboarding step enabled.')
      return
    }

    setTemplate(next)
    setPendingKey(key)

    const result = await updateOnboardingMilestoneIncluded(key, included)
    setPendingKey(null)

    if (result.success) {
      markSaved(key)
    } else {
      setTemplate(previous)
      toast.error(result.error)
    }
  }

  return (
    <SettingsSubsection
      title="Client onboarding checklist"
      description="Choose which milestones appear on each client's overview after they accept their invite."
      variant="panel"
    >
      {CLIENT_ONBOARDING_MILESTONE_OPTIONS.map((option) => {
        const included = isOnboardingMilestoneIncluded(template, option.key)

        return (
          <SettingsRow
            key={option.key}
            label={option.label}
            description={option.description}
          >
            <div className="flex items-center gap-2">
              <SettingsSavedIndicator visible={savedKey === option.key} />
              <SettingsToggle
                checked={included}
                disabled={pendingKey === option.key}
                label={`${included ? 'Exclude' : 'Include'} ${option.label}`}
                onCheckedChange={(checked) =>
                  void handleToggle(option.key, checked)
                }
              />
            </div>
          </SettingsRow>
        )
      })}
    </SettingsSubsection>
  )
}
