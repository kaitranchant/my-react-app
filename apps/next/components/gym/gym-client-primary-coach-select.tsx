'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { assignGymClientPrimaryCoach } from '@/app/(dashboard)/gym/actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import type { GymCoachOption } from '@/lib/gym-coach-options'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type GymClientPrimaryCoachCellProps = {
  gymId?: string
  clientId?: string
  coachId: string
  coachName: string
  coachAvatarUrl?: string | null
  coaches?: GymCoachOption[]
  canAssign?: boolean
}

export function GymClientPrimaryCoachCell({
  gymId,
  clientId,
  coachId,
  coachName,
  coachAvatarUrl,
  coaches = [],
  canAssign = false,
}: GymClientPrimaryCoachCellProps) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  if (
    !canAssign ||
    !gymId ||
    !clientId ||
    coaches.length <= 1 ||
    !coachId ||
    !coaches.some((coach) => coach.coachId === coachId)
  ) {
    return (
      <div className="flex items-center gap-2">
        <ClientAvatar
          name={coachName}
          avatarUrl={coachAvatarUrl}
          size="sm"
          className="shrink-0"
        />
        <span className="text-muted-foreground text-sm">{coachName}</span>
      </div>
    )
  }

  async function handleChange(newCoachId: string) {
    if (newCoachId === coachId || pending) {
      return
    }

    setPending(true)
    const result = await assignGymClientPrimaryCoach(gymId!, clientId!, newCoachId)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Primary coach updated.')
    router.refresh()
  }

  return (
    <Select value={coachId} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger size="sm" className="h-8 max-w-[220px]">
        <SelectValue>
          <span className="flex items-center gap-2">
            <ClientAvatar
              name={coachName}
              avatarUrl={coachAvatarUrl}
              size="sm"
              className="size-5 shrink-0"
            />
            <span className="truncate">{coachName}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {coaches.map((coach) => (
          <SelectItem key={coach.coachId} value={coach.coachId}>
            <span className="flex items-center gap-2">
              <ClientAvatar
                name={coach.coachName}
                avatarUrl={coach.avatarUrl}
                size="sm"
                className="size-5 shrink-0"
              />
              <span>{coach.coachName}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
