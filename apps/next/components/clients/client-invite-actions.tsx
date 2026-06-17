'use client'

import * as React from 'react'
import { Copy, Mail, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import {
  getClientInviteLink,
  sendClientInvite,
} from '@/app/(dashboard)/clients/actions'
import { Button } from '@/components/ui/button'
import type { Client } from 'app/types/database'

type ClientInviteActionsProps = {
  client: Client
}

export function ClientInviteActions({ client }: ClientInviteActionsProps) {
  const [pending, setPending] = React.useState(false)

  const hasAccount =
    client.invite_status === 'accepted' || Boolean(client.user_id)
  const isPending = client.invite_status === 'pending'

  async function handleSendInvite() {
    setPending(true)
    const result = await sendClientInvite(client.id)
    setPending(false)

    if (result.success) {
      await navigator.clipboard.writeText(result.inviteUrl)
      toast.success('Invite link copied to clipboard')
    } else {
      toast.error(result.error)
    }
  }

  async function handleCopyLink() {
    setPending(true)
    const result = await getClientInviteLink(client.id)
    setPending(false)

    if (result.success) {
      await navigator.clipboard.writeText(result.inviteUrl)
      toast.success('Invite link copied')
    } else {
      toast.error(result.error)
    }
  }

  if (hasAccount) {
    return (
      <p className="text-muted-foreground text-sm">
        This client can sign in to view workouts you assign them.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
        {isPending
          ? 'Waiting for your client to accept the invite and create their account.'
          : 'Send an invite so they can create an account and track their workouts.'}
      </p>
      <div className="flex shrink-0 flex-wrap gap-2">
        {isPending ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={handleCopyLink}
            >
              <Copy className="size-4" />
              Copy link
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={handleSendInvite}
            >
              <RefreshCw className="size-4" />
              New link
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleSendInvite}
          >
            <Mail className="size-4" />
            Send invite
          </Button>
        )}
      </div>
    </div>
  )
}
