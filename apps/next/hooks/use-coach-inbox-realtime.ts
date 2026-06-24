'use client'

import * as React from 'react'

import { createClient } from '@/lib/supabase/client'
import {
  formatInboxPreview,
  type InboxConversation,
} from '@/lib/message-inbox'
import type { ClientMessage, MessageSenderRole } from 'app/types/database'

type InboxRealtimeMessage = Pick<
  ClientMessage,
  'client_id' | 'body' | 'sender_role' | 'created_at' | 'message_type'
>

function bumpConversation(
  conversations: InboxConversation[],
  message: InboxRealtimeMessage,
  coachId: string
): InboxConversation[] {
  const previewBody =
    message.message_type === 'voice'
      ? message.body?.trim() || 'Voice message'
      : message.body

  const updated = conversations.map((conversation) => {
    if (conversation.clientId !== message.client_id) {
      return conversation
    }

    const isUnreadClientMessage = message.sender_role === 'client'
    return {
      ...conversation,
      lastMessageAt: message.created_at,
      lastMessageBody: previewBody,
      lastMessageSenderRole: message.sender_role as MessageSenderRole,
      lastMessageType: message.message_type ?? 'text',
      unreadCount: isUnreadClientMessage
        ? conversation.unreadCount + 1
        : conversation.unreadCount,
    }
  })

  return updated.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1
    if (a.lastMessageAt && b.lastMessageAt) {
      return (
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      )
    }
    return 0
  })
}

export function useCoachInboxRealtime(
  coachId: string | null,
  initialConversations: InboxConversation[]
) {
  const [conversations, setConversations] = React.useState(initialConversations)

  React.useEffect(() => {
    setConversations(initialConversations)
  }, [coachId, initialConversations])

  React.useEffect(() => {
    if (!coachId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`coach-inbox:${coachId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_messages',
          filter: `coach_id=eq.${coachId}`,
        },
        (payload) => {
          const message = payload.new as InboxRealtimeMessage
          setConversations((current) => bumpConversation(current, message, coachId))
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [coachId])

  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0
  )

  return { conversations, totalUnread, formatInboxPreview }
}
