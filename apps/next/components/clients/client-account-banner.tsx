'use client'

import * as React from 'react'
import { X } from 'lucide-react'

import { ClientInviteActions } from '@/components/clients/client-invite-actions'
import { ClientInviteStatusBadge } from '@/components/clients/client-invite-status-badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Client } from 'app/types/database'

const DISMISS_KEY = (clientId: string) =>
  `client-invite-banner-dismissed:${clientId}`

export function ClientAccountBanner({ client }: { client: Client }) {
  const [dismissed, setDismissed] = React.useState(false)

  React.useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY(client.id)) === '1')
    } catch {
      // ignore
    }
  }, [client.id])

  const hasAccount =
    client.invite_status === 'accepted' || Boolean(client.user_id)

  if (hasAccount) return null

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY(client.id), '1')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  if (dismissed || client.invite_status === 'pending') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm',
          client.invite_status === 'pending'
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-border bg-muted/30'
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <ClientInviteStatusBadge status={client.invite_status} />
          <span className="text-muted-foreground">
            {client.invite_status === 'pending'
              ? 'Invite sent — waiting for client to sign up.'
              : 'No portal account yet — send an invite for self-logging.'}
          </span>
        </div>
        <ClientInviteActions client={client} />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Client account</CardTitle>
          <CardDescription>
            Connect this client to their own login for workout tracking.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <ClientInviteStatusBadge status={client.invite_status} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground size-8 shrink-0"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ClientInviteActions client={client} />
      </CardContent>
    </Card>
  )
}
