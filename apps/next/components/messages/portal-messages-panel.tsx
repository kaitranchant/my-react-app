'use client'

import { useRouter } from 'next/navigation'

import {
  markPortalMessagesRead,
  sendPortalMessage,
  sendPortalVoiceMessage,
} from '@/app/portal/message-actions'
import { ClientMessagesPanel } from '@/components/messages/client-messages-panel'
import type { ClientMessageWithUrl } from 'app/types/database'

type PortalMessagesPanelProps = {
  clientId: string
  clientName: string
  messages: ClientMessageWithUrl[]
  schemaError?: string | null
}

export function PortalMessagesPanel({
  clientId,
  clientName,
  messages,
  schemaError = null,
}: PortalMessagesPanelProps) {
  const router = useRouter()

  async function handleMarkRead() {
    const result = await markPortalMessagesRead()
    if (result.success) {
      router.refresh()
    }
    return result
  }

  return (
    <ClientMessagesPanel
      variant="client"
      clientId={clientId}
      clientName={clientName}
      messages={messages}
      schemaError={schemaError}
      onSend={sendPortalMessage}
      onSendVoice={sendPortalVoiceMessage}
      onMarkRead={handleMarkRead}
    />
  )
}
