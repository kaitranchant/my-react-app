'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  shareAllTeamsWithGym,
  shareTeamWithGym,
  unshareTeamFromGym,
} from '@/app/(dashboard)/teams/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Gym, Team } from 'app/types/database'

export function TeamGymSharePanel({
  team,
  gyms,
  isPrimaryCoach,
}: {
  team: Pick<Team, 'id' | 'gym_id'>
  gyms: Pick<Gym, 'id' | 'name'>[]
  isPrimaryCoach: boolean
}) {
  const router = useRouter()
  const [pendingGymId, setPendingGymId] = React.useState<string | null>(null)

  if (gyms.length === 0) {
    return null
  }

  const memberGym = team.gym_id ? gyms.find((gym) => gym.id === team.gym_id) : null

  if (!isPrimaryCoach) {
    return memberGym ? (
      <Badge variant="secondary">{memberGym.name} member</Badge>
    ) : null
  }

  async function addToGym(gymId: string) {
    setPendingGymId(gymId)
    const result = await shareTeamWithGym(team.id, gymId)
    setPendingGymId(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Team added as a gym member.')
    router.refresh()
  }

  async function removeFromGym() {
    setPendingGymId('remove')
    const result = await unshareTeamFromGym(team.id)
    setPendingGymId(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Team removed from gym.')
    router.refresh()
  }

  if (memberGym) {
    return (
      <Button
        variant="secondary"
        disabled={pendingGymId !== null}
        onClick={removeFromGym}
      >
        {pendingGymId === 'remove'
          ? 'Saving…'
          : `Remove from ${memberGym.name}`}
      </Button>
    )
  }

  if (gyms.length === 1) {
    const gym = gyms[0]
    return (
      <Button
        variant="outline"
        disabled={pendingGymId !== null}
        onClick={() => addToGym(gym.id)}
      >
        {pendingGymId === gym.id ? 'Saving…' : `Add to ${gym.name}`}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {gyms.map((gym) => (
        <Button
          key={gym.id}
          variant="outline"
          disabled={pendingGymId !== null}
          onClick={() => addToGym(gym.id)}
        >
          {pendingGymId === gym.id ? 'Saving…' : `Add to ${gym.name}`}
        </Button>
      ))}
    </div>
  )
}

export function ShareAllTeamsButton({ gymId }: { gymId: string }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleAddAll() {
    if (
      !window.confirm(
        'Add all of your teams as members of this gym? Other gym coaches will be able to view and manage them.'
      )
    ) {
      return
    }

    setPending(true)
    const result = await shareAllTeamsWithGym(gymId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(
      `Added ${result.count} team${result.count === 1 ? '' : 's'} as gym members.`
    )
    router.refresh()
  }

  return (
    <Button variant="outline" disabled={pending} onClick={handleAddAll}>
      {pending ? 'Adding…' : 'Add all my teams as members'}
    </Button>
  )
}
