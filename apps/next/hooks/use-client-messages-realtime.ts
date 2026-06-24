'use client'

import * as React from 'react'

import { createClient } from '@/lib/supabase/client'
import type { ClientMessage } from 'app/types/database'

export function useClientMessagesRealtime(
  clientId: string | null,
  initialMessages: ClientMessage[]
) {
  const [messages, setMessages] = React.useState(initialMessages)

  React.useEffect(() => {
    setMessages(initialMessages)
  }, [clientId, initialMessages])

  React.useEffect(() => {
    if (!clientId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`client-messages:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'client_messages',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const incoming = payload.new as ClientMessage
          setMessages((current) => {
            if (current.some((message) => message.id === incoming.id)) {
              return current
            }
            return [...current, incoming].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            )
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [clientId])

  return messages
}
