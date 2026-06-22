'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, UserMinus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  shareAllClientsWithGym,
  shareClientsWithGym,
  shareClientWithGym,
  unshareClientFromGym,
} from '@/app/(dashboard)/clients/actions'
import { GymMembershipPickerDialog } from '@/components/gym/gym-membership-picker-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Client, Gym } from 'app/types/database'

function useClientGymShareActions(
  client: Pick<Client, 'id' | 'gym_id'>,
  gyms: Pick<Gym, 'id' | 'name'>[]
) {
  const router = useRouter()
  const [pendingGymId, setPendingGymId] = React.useState<string | null>(null)

  const memberGym = client.gym_id
    ? gyms.find((gym) => gym.id === client.gym_id)
    : null

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

  return {
    memberGym,
    pendingGymId,
    addToGym,
    removeFromGym,
  }
}

export function ClientGymMemberBadge({
  client,
  gyms,
}: {
  client: Pick<Client, 'gym_id'>
  gyms: Pick<Gym, 'id' | 'name'>[]
}) {
  const memberGym = client.gym_id
    ? gyms.find((gym) => gym.id === client.gym_id)
    : null

  if (!memberGym) {
    return null
  }

  return <Badge variant="secondary">{memberGym.name} member</Badge>
}

export function ClientGymShareMenu({
  client,
  gyms,
  isPrimaryCoach,
}: {
  client: Pick<Client, 'id' | 'gym_id'>
  gyms: Pick<Gym, 'id' | 'name'>[]
  isPrimaryCoach: boolean
}) {
  const { memberGym, pendingGymId, addToGym, removeFromGym } =
    useClientGymShareActions(client, gyms)

  if (gyms.length === 0 || !isPrimaryCoach) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" disabled={pendingGymId !== null}>
          <MoreHorizontal className="size-4" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {memberGym ? (
          <DropdownMenuItem
            variant="destructive"
            disabled={pendingGymId !== null}
            onSelect={removeFromGym}
          >
            <UserMinus className="size-4" />
            {pendingGymId === 'remove'
              ? 'Saving…'
              : `Remove from ${memberGym.name}`}
          </DropdownMenuItem>
        ) : (
          gyms.map((gym) => (
            <DropdownMenuItem
              key={gym.id}
              disabled={pendingGymId !== null}
              onSelect={() => addToGym(gym.id)}
            >
              <UserPlus className="size-4" />
              {pendingGymId === gym.id ? 'Saving…' : `Add to ${gym.name}`}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

type AddClientsPreview = {
  id: string
  full_name: string
  gym_id: string | null
}

export function AddClientsButton({
  gymId,
  gymName,
  clients,
}: {
  gymId: string
  gymName: string
  clients: AddClientsPreview[]
}) {
  return (
    <GymMembershipPickerDialog
      gymId={gymId}
      gymName={gymName}
      items={clients.map((client) => ({
        id: client.id,
        name: client.full_name,
        gym_id: client.gym_id,
      }))}
      triggerLabel="Add clients"
      title={`Add clients to ${gymName}`}
      description="Select clients to add, or add all at once. Other coaches in this gym will be able to view and manage them."
      itemLabelSingular="client"
      itemLabelPlural="clients"
      onAddSelected={(clientIds) => shareClientsWithGym(gymId, clientIds)}
      onAddAll={() => shareAllClientsWithGym(gymId)}
    />
  )
}
