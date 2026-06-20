'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { acceptGymInvite } from '@/app/(dashboard)/gym/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function AcceptGymInviteCard({
  gymName,
  inviterName,
  token,
}: {
  gymName: string
  inviterName: string
  token: string
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleAccept() {
    setPending(true)
    const result = await acceptGymInvite(token)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(`You joined ${gymName}.`)
    router.replace(`/gym?gym=${result.gymId}`)
    router.refresh()
  }

  return (
    <Card className="mx-auto max-w-lg shadow-card">
      <CardHeader>
        <CardTitle>Join {gymName}</CardTitle>
        <CardDescription>
          {inviterName} invited you to join their gym as a coach.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" disabled={pending} onClick={handleAccept}>
          {pending ? 'Joining…' : 'Accept invite'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function GymJoinClient({
  gymName,
  inviterName,
  token,
  invalid,
}: {
  gymName?: string
  inviterName?: string
  token?: string
  invalid?: boolean
}) {
  if (invalid || !token || !gymName) {
    return (
      <Card className="mx-auto max-w-lg shadow-card">
        <CardHeader>
          <CardTitle>Invalid invite</CardTitle>
          <CardDescription>
            This gym invite link is invalid or has expired. Ask the gym owner
            for a new link.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <AcceptGymInviteCard
      gymName={gymName}
      inviterName={inviterName ?? 'A coach'}
      token={token}
    />
  )
}
