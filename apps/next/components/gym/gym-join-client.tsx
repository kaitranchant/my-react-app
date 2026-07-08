'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { acceptGymInvite } from '@/app/(dashboard)/gym/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
    <Card className="shadow-card">
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
  inviteEmail,
  invalid,
  isAuthenticated = false,
  signupHref,
  loginHref,
}: {
  gymName?: string
  inviterName?: string
  token?: string
  inviteEmail?: string
  invalid?: boolean
  isAuthenticated?: boolean
  signupHref?: string
  loginHref?: string
}) {
  if (invalid || !token || !gymName) {
    return (
      <Card className="shadow-card">
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

  if (!isAuthenticated) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Join {gymName}</CardTitle>
          <CardDescription>
            {inviterName ?? 'A coach'} invited
            {inviteEmail ? ` ${inviteEmail} ` : ' you '}
            to join their gym as a coach. Sign up or sign in with that email to
            accept.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          {signupHref ? (
            <Button asChild className="w-full sm:flex-1">
              <Link href={signupHref}>Create account</Link>
            </Button>
          ) : null}
          {loginHref ? (
            <Button asChild variant="outline" className="w-full sm:flex-1">
              <Link href={loginHref}>Sign in</Link>
            </Button>
          ) : null}
        </CardFooter>
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
