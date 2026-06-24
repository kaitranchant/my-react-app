import { createClient } from '@/lib/supabase/server'
import { CoachClientMessagesPanel } from '@/components/messages/coach-client-messages-panel'
import type { ClientMessage } from 'app/types/database'

type ClientDetailMessagesPanelProps = {
  clientId: string
  clientName: string
}

export async function ClientDetailMessagesPanel({
  clientId,
  clientName,
}: ClientDetailMessagesPanelProps) {
  const supabase = await createClient()

  const messagesResult = await supabase
    .from('client_messages')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(200)

  const messages = (messagesResult.data ?? []) as ClientMessage[]

  return (
    <CoachClientMessagesPanel
      clientId={clientId}
      clientName={clientName}
      messages={messages}
      schemaError={messagesResult.error?.message ?? null}
    />
  )
}
