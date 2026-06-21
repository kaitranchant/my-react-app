'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { updateMyBiologicalSex } from '@/app/portal/leaderboard-actions'
import { SettingsRow } from '@/components/settings/settings-row'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BiologicalSex } from 'app/types/database'

type PortalLeaderboardProfileCardProps = {
  defaultBiologicalSex: BiologicalSex | null
}

export function PortalLeaderboardProfileCard({
  defaultBiologicalSex,
}: PortalLeaderboardProfileCardProps) {
  const [biologicalSex, setBiologicalSex] = React.useState(defaultBiologicalSex)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    setBiologicalSex(defaultBiologicalSex)
  }, [defaultBiologicalSex])

  async function onBiologicalSexChange(value: string) {
    const nextSex = value === 'unset' ? null : (value as BiologicalSex)
    const previous = biologicalSex
    setBiologicalSex(nextSex)
    setPending(true)

    const result = await updateMyBiologicalSex(nextSex)
    setPending(false)

    if (result.success) {
      toast.success('Leaderboard profile updated')
      return
    }

    setBiologicalSex(previous)
    toast.error(result.error)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your leaderboard profile</CardTitle>
        <CardDescription>
          Wilks / DOTS scoring needs biological sex and a recent bodyweight from
          check-ins or InBody scans.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SettingsRow
          label="Biological sex"
          description="Used for Wilks and DOTS coefficient tables."
        >
          <Select
            value={biologicalSex ?? 'unset'}
            onValueChange={onBiologicalSexChange}
            disabled={pending}
          >
            <SelectTrigger className="w-[160px]" aria-label="Biological sex">
              <SelectValue placeholder="Not set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Not set</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </CardContent>
    </Card>
  )
}
