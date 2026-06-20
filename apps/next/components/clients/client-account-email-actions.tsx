'use client'

import * as React from 'react'
import { KeyRound, Mail } from 'lucide-react'
import { toast } from 'sonner'

import {
  resendClientActivationEmail,
  sendClientPasswordResetEmail,
} from '@/app/(dashboard)/clients/actions'
import { Button } from '@/components/ui/button'
import type { Client } from 'app/types/database'

type ClientAccountEmailActionsProps = {
  client: Client
}

export function ClientAccountEmailActions({
  client,
}: ClientAccountEmailActionsProps) {
  const [pending, setPending] = React.useState(false)

  const hasAccount =
    client.invite_status === 'accepted' || Boolean(client.user_id)
  const hasEmail = Boolean(client.email?.trim())

  async function handlePasswordReset() {
    setPending(true)
    const result = await sendClientPasswordResetEmail(client.id)
    setPending(false)

    if (result.success) {
      toast.success('Password reset email sent')
    } else {
      toast.error(result.error)
    }
  }

  async function handleResendActivation() {
    setPending(true)
    const result = await resendClientActivationEmail(client.id)
    setPending(false)

    if (result.success) {
      toast.success('Activation email sent')
    } else {
      toast.error(result.error)
    }
  }

  if (hasAccount) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Account access</p>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          {hasEmail
            ? `Send a password reset link to ${client.email}.`
            : 'Add an email address to send a password reset link.'}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          disabled={pending || !hasEmail}
          onClick={handlePasswordReset}
        >
          <KeyRound className="size-4" />
          Send password reset email
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-sm font-medium">Account activation</p>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {hasEmail
          ? `Resend the activation email so ${client.full_name} can create their account.`
          : 'Add an email address to send an activation email.'}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={pending || !hasEmail}
        onClick={handleResendActivation}
      >
        <Mail className="size-4" />
        Resend activation email
      </Button>
    </div>
  )
}
