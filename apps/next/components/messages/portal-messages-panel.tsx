'use client'

import {
  markPortalMessagesRead,
  sendPortalMessage,
} from '@/app/portal/message-actions'
import { ClientMessagesPanel } from '@/components/messages/client-messages-panel'
import type { ClientMessage } from 'app/types/database'

type PortalMessagesPanelProps = {
  clientName: string
  messages: ClientMessage[]
  schemaError?: string | null
}

export function PortalMessagesPanel({
  clientName,
  messages,
  schemaError = null,
}: PortalMessagesPanelProps) {
  return (
    <ClientMessagesPanel
      variant="client"
      clientName={clientName}
      messages={messages}
      schemaError={schemaError}
      onSend={sendPortalMessage}
      onMarkRead={markPortalMessagesRead}
    />
  )
}
