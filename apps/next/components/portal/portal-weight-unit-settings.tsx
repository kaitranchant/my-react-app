'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updatePortalWeightUnit } from '@/app/portal/account/actions'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WeightUnit } from 'app/types/database'

type PortalWeightUnitSettingsProps = {
  defaultWeightUnit: WeightUnit
}

export function PortalWeightUnitSettings({
  defaultWeightUnit,
}: PortalWeightUnitSettingsProps) {
  const [weightUnit, setWeightUnit] = React.useState(defaultWeightUnit)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setWeightUnit(defaultWeightUnit)
  }, [defaultWeightUnit])

  async function onWeightUnitChange(value: string) {
    const nextUnit = value as WeightUnit
    const previous = weightUnit
    setWeightUnit(nextUnit)
    setPending(true)

    const result = await updatePortalWeightUnit(nextUnit)
    setPending(false)

    if (result.success) {
      toast.success('Weight unit updated')
      return
    }

    setWeightUnit(previous)
    toast.error(result.error)
  }

  return (
    <SettingsRow
      label="Weight unit"
      description="How weights appear in workout logs, check-ins, and progress charts."
    >
      <Select
        value={weightUnit}
        onValueChange={(value) => void onWeightUnitChange(value)}
        disabled={pending}
      >
        <SelectTrigger className="w-[120px]" aria-label="Weight unit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="lbs">lbs</SelectItem>
          <SelectItem value="kg">kg</SelectItem>
        </SelectContent>
      </Select>
    </SettingsRow>
  )
}
