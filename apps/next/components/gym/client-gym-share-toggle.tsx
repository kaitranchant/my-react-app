'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  shareAllClientsWithGym,
  shareClientWithGym,
  unshareClientFromGym,
} from '@/app/(dashboard)/clients/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Client, Gym } from 'app/types/database'

export function ClientGymSharePanel({
  client,
  gyms,
  isPrimaryCoach,
}: {
  client: Pick<Client, 'id' | 'gym_id'>
  gyms: Pick<Gym, 'id' | 'name'>[]
  isPrimaryCoach: boolean
}) {
  const router = useRouter()
  const [pendingGymId, setPendingGymId] = React.useState<string | null>(null)

  if (gyms.length === 0) {
    return null
  }

  const memberGym = client.gym_id
    ? gyms.find((gym) => gym.id === client.gym_id)
    : null

  if (!isPrimaryCoach) {
    return memberGym ? (
      <Badge variant="secondary">{memberGym.name} member</Badge>
    ) : null
  }

  async function addToGym(gymId: string) {
    setPendingGymId(gymId)
    const result = await shareClientWithGym(client.id, gymId)
    setPendingGymId(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Client added as a gym member.')
    router.refresh()
  }

  async function removeFromGym() {
    setPendingGymId('remove')
    const result = await unshareClientFromGym(client.id)
    setPendingGymId(null)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Client removed from gym.')
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

export function ShareAllClientsButton({ gymId }: { gymId: string }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleAddAll() {
    if (
      !window.confirm(
        'Add all of your clients as members of this gym? Other gym coaches will be able to view and manage them.'
      )
    ) {
      return
    }

    setPending(true)
    const result = await shareAllClientsWithGym(gymId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(
      `Added ${result.count} client${result.count === 1 ? '' : 's'} as gym members.`
    )
    router.refresh()
  }

  return (
    <Button variant="outline" disabled={pending} onClick={handleAddAll}>
      {pending ? 'Adding…' : 'Add all my clients as members'}
    </Button>
  )
}
