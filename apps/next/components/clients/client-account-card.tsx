import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ClientInviteActions } from '@/components/clients/client-invite-actions'
import { ClientInviteStatusBadge } from '@/components/clients/client-invite-status-badge'
import type { Client } from 'app/types/database'

export function ClientAccountCard({ client }: { client: Client }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Client account</CardTitle>
          <CardDescription>
            Connect this client to their own login for workout tracking.
          </CardDescription>
        </div>
        <ClientInviteStatusBadge status={client.invite_status} />
      </CardHeader>
      <CardContent>
        <ClientInviteActions client={client} />
      </CardContent>
    </Card>
  )
}
