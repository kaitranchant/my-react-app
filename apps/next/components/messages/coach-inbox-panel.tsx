'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, MessageSquare } from 'lucide-react'

import {
  markCoachMessagesRead,
  sendCoachMessage,
} from '@/app/(dashboard)/clients/[clientId]/messages/actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { ClientMessagesPanel } from '@/components/messages/client-messages-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRelativeTime } from '@/lib/dashboard'
import {
  formatInboxPreview,
  type InboxConversation,
} from '@/lib/message-inbox'
import { cn } from '@/lib/utils'
import type { ClientMessage } from 'app/types/database'

type CoachInboxPanelProps = {
  conversations: InboxConversation[]
  defaultClientId: string | null
  selectedClientId: string | null
  messages: ClientMessage[]
  schemaError?: string | null
}

export function CoachInboxPanel({
  conversations,
  defaultClientId,
  selectedClientId,
  messages,
  schemaError = null,
}: CoachInboxPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = React.useState('')

  const activeClientId = selectedClientId ?? defaultClientId
  const activeConversation = conversations.find(
    (conversation) => conversation.clientId === activeClientId
  )

  const filteredConversations = conversations.filter((conversation) => {
    if (!query.trim()) return true
    return conversation.clientName
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  })

  function selectClient(clientId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('client', clientId)
    router.replace(`/messages?${params.toString()}`, { scroll: false })
  }

  function clearSelection() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('client')
    const queryString = params.toString()
    router.replace(queryString ? `/messages?${queryString}` : '/messages', {
      scroll: false,
    })
  }

  if (schemaError?.includes('Could not find the table')) {
    return (
      <SchemaSetupNotice
        tables={['client_messages', 'client_message_threads']}
        sqlFile="apply-client-messages.sql"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <div className="grid min-h-[min(36rem,70vh)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={cn(
            'flex flex-col border-b lg:border-b-0 lg:border-r',
            selectedClientId && 'max-lg:hidden'
          )}
        >
          <div className="space-y-3 border-b px-4 py-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search clients…"
              aria-label="Search conversations"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                {query.trim()
                  ? 'No clients match your search.'
                  : 'No active clients yet.'}
              </p>
            ) : (
              <ul className="divide-y">
                {filteredConversations.map((conversation) => {
                  const isActive = conversation.clientId === activeClientId
                  return (
                    <li key={conversation.clientId}>
                      <button
                        type="button"
                        onClick={() => selectClient(conversation.clientId)}
                        className={cn(
                          'hover:bg-muted/60 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                          isActive && 'bg-brand/8'
                        )}
                      >
                        <ClientAvatar
                          name={conversation.clientName}
                          avatarUrl={conversation.avatarUrl}
                          size="sm"
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'truncate text-sm',
                                conversation.unreadCount > 0
                                  ? 'font-semibold'
                                  : 'font-medium'
                              )}
                            >
                              {conversation.clientName}
                            </p>
                            {conversation.lastMessageAt && (
                              <span className="text-muted-foreground shrink-0 text-[11px]">
                                {formatRelativeTime(conversation.lastMessageAt)}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p
                              className={cn(
                                'truncate text-xs',
                                conversation.unreadCount > 0
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {formatInboxPreview(
                                conversation.lastMessageBody,
                                conversation.lastMessageSenderRole
                              )}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 text-[10px]">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        <section
          className={cn(
            'flex min-h-64 flex-col',
            !selectedClientId && 'max-lg:hidden',
            !activeClientId && 'hidden lg:flex'
          )}
        >
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={clearSelection}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="size-4" />
                </Button>
                <ClientAvatar
                  name={activeConversation.clientName}
                  avatarUrl={activeConversation.avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {activeConversation.clientName}
                  </p>
                  <Link
                    href={`/clients/${activeConversation.clientId}?tab=messages`}
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                  >
                    Open client profile
                  </Link>
                </div>
              </div>

              <div className="min-h-0 flex-1">
                <ClientMessagesPanel
                  variant="coach"
                  clientName={activeConversation.clientName}
                  messages={messages}
                  schemaError={schemaError}
                  showHeader={false}
                  className="h-full rounded-none border-0 shadow-none"
                  onSend={(body) =>
                    sendCoachMessage(activeConversation.clientId, body)
                  }
                  onMarkRead={() =>
                    markCoachMessagesRead(activeConversation.clientId)
                  }
                />
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center text-sm">
              <MessageSquare className="size-8 opacity-40" />
              <p>Select a client to view your conversation.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
