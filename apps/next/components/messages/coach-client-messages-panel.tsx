'use client'

import {
  markCoachMessagesRead,
  sendCoachMessage,
  sendCoachVoiceMessage,
} from '@/app/(dashboard)/clients/[clientId]/messages/actions'
import { ClientMessagesPanel } from '@/components/messages/client-messages-panel'
import type { ClientMessageWithUrl, CoachMessageTemplate } from 'app/types/database'

type CoachClientMessagesPanelProps = {
  clientId: string
  clientName: string
  messages: ClientMessageWithUrl[]
  messageTemplates?: CoachMessageTemplate[]
  schemaError?: string | null
}

export function CoachClientMessagesPanel({
  clientId,
  clientName,
  messages,
  messageTemplates = [],
  schemaError = null,
}: CoachClientMessagesPanelProps) {
  return (
    <ClientMessagesPanel
      variant="coach"
      clientId={clientId}
      clientName={clientName}
      messages={messages}
      messageTemplates={messageTemplates}
      schemaError={schemaError}
      onSend={(body) => sendCoachMessage(clientId, body)}
      onSendVoice={(formData) => sendCoachVoiceMessage(clientId, formData)}
      onMarkRead={() => markCoachMessagesRead(clientId)}
    />
  )
}
