import { createClient } from '@/lib/supabase/server'
import { attachSignedUrlsToMessages } from '@/lib/message-media'
import { fetchCoachMessageTemplates } from '@/lib/message-templates'
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const messagesResult = await supabase
    .from('client_messages')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
    .limit(200)

  const messages = await attachSignedUrlsToMessages(
    supabase,
    (messagesResult.data ?? []) as ClientMessage[]
  )
  const { templates: messageTemplates } = user
    ? await fetchCoachMessageTemplates(supabase, user.id)
    : { templates: [] }

  return (
    <CoachClientMessagesPanel
      clientId={clientId}
      clientName={clientName}
      messages={messages}
      messageTemplates={messageTemplates}
      schemaError={messagesResult.error?.message ?? null}
    />
  )
}
