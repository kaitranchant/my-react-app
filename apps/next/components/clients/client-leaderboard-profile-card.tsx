'use client'

import * as React from 'react'
import { toast } from 'sonner'

import {
  updateClientBiologicalSex,
  updateClientLeaderboardOptOut,
} from '@/app/(dashboard)/clients/actions'
import { SettingsRow } from '@/components/settings/settings-row'
import { SettingsToggle } from '@/components/settings/settings-toggle'
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

type ClientLeaderboardProfileCardProps = {
  clientId: string
  defaultOptOut: boolean
  defaultBiologicalSex: BiologicalSex | null
  disabled?: boolean
}

export function ClientLeaderboardProfileCard({
  clientId,
  defaultOptOut,
  defaultBiologicalSex,
  disabled = false,
}: ClientLeaderboardProfileCardProps) {
  const [optOut, setOptOut] = React.useState(defaultOptOut)
  const [biologicalSex, setBiologicalSex] = React.useState(defaultBiologicalSex)
  const [optOutPending, setOptOutPending] = React.useState(false)
  const [sexPending, setSexPending] = React.useState(false)

  React.useEffect(() => {
    setOptOut(defaultOptOut)
  }, [defaultOptOut])

  React.useEffect(() => {
    setBiologicalSex(defaultBiologicalSex)
  }, [defaultBiologicalSex])

  async function onToggleOptOut(checked: boolean) {
    const previous = optOut
    setOptOut(checked)
    setOptOutPending(true)

    const result = await updateClientLeaderboardOptOut(clientId, checked)
    setOptOutPending(false)

    if (result.success) {
      toast.success(
        checked
          ? 'Client hidden from leaderboards'
          : 'Client included on leaderboards'
      )
      return
    }

    setOptOut(previous)
    toast.error(result.error)
  }

  async function onBiologicalSexChange(value: string) {
    const nextSex = value === 'unset' ? null : (value as BiologicalSex)
    const previous = biologicalSex
    setBiologicalSex(nextSex)
    setSexPending(true)

    const result = await updateClientBiologicalSex(clientId, nextSex)
    setSexPending(false)

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
        <CardTitle className="text-base">Leaderboard profile</CardTitle>
        <CardDescription>
          Wilks / DOTS scoring needs biological sex and a recent bodyweight from
          InBody or check-ins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SettingsRow
          label="Biological sex"
          description="Used for Wilks and DOTS coefficient tables."
        >
          <Select
            value={biologicalSex ?? 'unset'}
            onValueChange={onBiologicalSexChange}
            disabled={disabled || sexPending}
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

        <SettingsRow
          label="Hide from leaderboards"
          description="The athlete can still log workouts and track their own progress."
        >
          <SettingsToggle
            checked={optOut}
            disabled={disabled || optOutPending}
            onCheckedChange={onToggleOptOut}
            label="Hide from leaderboards"
          />
        </SettingsRow>
      </CardContent>
    </Card>
  )
}
