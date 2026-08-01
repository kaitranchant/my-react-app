'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updateDashboardSectionVisibility } from '@/app/(dashboard)/settings/actions'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  SettingsSavedIndicator,
  useSettingsSavedIndicator,
} from '@/components/settings/settings-saved-indicator'
import { SettingsToggle } from '@/components/settings/settings-toggle'
import {
  dashboardSectionOptions,
  type DashboardPreferences,
} from '@/lib/dashboard-preferences'
import type { DashboardSectionKey } from '@/lib/validations/dashboard-preferences'

export function DashboardSettings({
  defaultValues,
}: {
  defaultValues: DashboardPreferences
}) {
  const [values, setValues] = React.useState(defaultValues)
  const [pendingKey, setPendingKey] =
    React.useState<DashboardSectionKey | null>(null)
  const { savedKey, markSaved } = useSettingsSavedIndicator()

  React.useEffect(() => {
    setValues(defaultValues)
  }, [defaultValues])

  async function onToggle(key: DashboardSectionKey, checked: boolean) {
    const previous = values[key]
    setValues((current) => ({ ...current, [key]: checked }))
    setPendingKey(key)

    const result = await updateDashboardSectionVisibility(key, checked)
    setPendingKey(null)

    if (result.success) {
      markSaved(key)
      return
    }

    setValues((current) => ({ ...current, [key]: previous }))
    toast.error(result.error)
  }

  return (
    <>
      {dashboardSectionOptions.map((option) => (
        <SettingsRow
          key={option.key}
          label={option.label}
          description={option.description}
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
    </>
  )
}
