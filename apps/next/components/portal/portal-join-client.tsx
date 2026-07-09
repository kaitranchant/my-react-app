'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { acceptClientInvite } from '@/app/(auth)/portal/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function AcceptClientInviteCard({
  clientName,
  coachName,
  token,
}: {
  clientName: string
  coachName: string
  token: string
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleAccept() {
    setPending(true)
    const result = await acceptClientInvite(token)
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(`You are now connected with ${coachName}.`)
    router.replace('/portal')
    router.refresh()
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Join {coachName}</CardTitle>
        <CardDescription>
          Accept this invite to access your client portal and training with{' '}
          {coachName}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Client profile: {clientName}
        </p>
        <Button className="mt-4 w-full" disabled={pending} onClick={handleAccept}>
          {pending ? 'Accepting…' : 'Accept invite'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function PortalJoinClient({
  clientName,
  coachName,
  token,
  inviteEmail,
  invalid,
  isAuthenticated = false,
  signupHref,
  loginHref,
}: {
  clientName?: string
  coachName?: string
  token?: string
  inviteEmail?: string
  invalid?: boolean
  isAuthenticated?: boolean
  signupHref?: string
  loginHref?: string
}) {
  if (invalid || !token || !clientName || !coachName) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Invalid invite</CardTitle>
          <CardDescription>
            This client invite link is invalid or has expired. Ask your coach for
            a new link.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isAuthenticated) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Join {coachName}</CardTitle>
          <CardDescription>
            {coachName} invited
            {inviteEmail ? ` ${inviteEmail} ` : ' you '}
            to join as a client. Sign up or sign in with that email to accept.
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
    <AcceptClientInviteCard
      clientName={clientName}
      coachName={coachName}
      token={token}
    />
  )
}
