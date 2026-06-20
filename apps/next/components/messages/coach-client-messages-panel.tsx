'use client'

import {
  markCoachMessagesRead,
  sendCoachMessage,
} from '@/app/(dashboard)/clients/[clientId]/messages/actions'
import { ClientMessagesPanel } from '@/components/messages/client-messages-panel'
import type { ClientMessage } from 'app/types/database'

type CoachClientMessagesPanelProps = {
  clientId: string
  clientName: string
  messages: ClientMessage[]
  schemaError?: string | null
}

export function CoachClientMessagesPanel({
  clientId,
  clientName,
  messages,
  schemaError = null,
}: CoachClientMessagesPanelProps) {
  return (
    <ClientMessagesPanel
      variant="coach"
      clientName={clientName}
      messages={messages}
      schemaError={schemaError}
      onSend={(body) => sendCoachMessage(clientId, body)}
      onMarkRead={() => markCoachMessagesRead(clientId)}
    />
  )
}
