import { PortalMessagesPanel } from '@/components/messages/portal-messages-panel'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'
import type { ClientMessage } from 'app/types/database'

export const metadata = {
  title: 'Messages — Coaching App',
}

export default async function PortalMessagesPage() {
  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  let messages: ClientMessage[] = []
  let schemaError: string | null = null

  if (clientRecord?.id) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_id', clientRecord.id)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      schemaError = error.message
    } else {
      messages = (data ?? []) as ClientMessage[]
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-1">
        <h1 className="page-title">Messages</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Chat with your coach about training, scheduling, or anything else.
        </p>
      </section>

      {!clientRecord ? (
        <PortalUnlinkedState feature="send messages" />
      ) : (
        <PortalMessagesPanel
          clientName={clientRecord.full_name}
          messages={messages}
          schemaError={schemaError}
        />
      )}
    </div>
  )
}
