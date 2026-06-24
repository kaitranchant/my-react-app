'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, MessageSquare } from 'lucide-react'

import {
  markCoachMessagesRead,
  sendCoachMessage,
  sendCoachVoiceMessage,
} from '@/app/(dashboard)/clients/[clientId]/messages/actions'
import {
  BroadcastComposeDialog,
  type BroadcastClientOption,
  type BroadcastTeamOption,
} from '@/components/messages/broadcast-compose-dialog'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { ClientMessagesPanel } from '@/components/messages/client-messages-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { LiveRelativeTime } from '@/components/ui/live-relative-time'
import { useCoachInboxRealtime } from '@/hooks/use-coach-inbox-realtime'
import { formatInboxPreview } from '@/lib/message-inbox'
import { cn } from '@/lib/utils'
import type { ClientMessageWithUrl, CoachMessageTemplate } from 'app/types/database'

type CoachInboxPanelProps = {
  coachId: string
  conversations: import('@/lib/message-inbox').InboxConversation[]
  defaultClientId: string | null
  selectedClientId: string | null
  messages: ClientMessageWithUrl[]
  messageTemplates?: CoachMessageTemplate[]
  broadcastClients?: BroadcastClientOption[]
  broadcastTeams?: BroadcastTeamOption[]
  schemaError?: string | null
}

export function CoachInboxPanel({
  coachId,
  conversations: initialConversations,
  defaultClientId,
  selectedClientId,
  messages,
  messageTemplates = [],
  broadcastClients = [],
  broadcastTeams = [],
  schemaError = null,
}: CoachInboxPanelProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = React.useState('')
  const { conversations } = useCoachInboxRealtime(coachId, initialConversations)

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
      <div className="grid min-h-[min(36rem,70dvh)] md:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={cn(
            'flex flex-col border-b md:border-b-0 md:border-r',
            selectedClientId && 'max-md:hidden'
          )}
        >
          <div className="space-y-3 border-b px-4 py-4">
            <div className="flex items-center gap-2">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search clients…"
                aria-label="Search conversations"
                className="flex-1"
              />
              {broadcastClients.length > 0 ? (
                <BroadcastComposeDialog
                  clients={broadcastClients}
                  teams={broadcastTeams}
                />
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="px-4 py-8">
                <EmptyState
                  icon={MessageSquare}
                  title={
                    query.trim() ? 'No matches' : 'No conversations yet'
                  }
                  description={
                    query.trim()
                      ? 'Try a different client name.'
                      : 'Add clients to your roster, then message them from here or their profile.'
                  }
                  action={
                    query.trim()
                      ? undefined
                      : { label: 'Add a client', href: '/clients' }
                  }
                  className="py-6"
                />
              </div>
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
                                <LiveRelativeTime iso={conversation.lastMessageAt} />
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
                                conversation.lastMessageSenderRole,
                                conversation.lastMessageType
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
            !selectedClientId && 'max-md:hidden',
            !activeClientId && 'hidden md:flex'
          )}
        >
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
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
                  clientId={activeConversation.clientId}
                  clientName={activeConversation.clientName}
                  messages={messages}
                  messageTemplates={messageTemplates}
                  schemaError={schemaError}
                  showHeader={false}
                  className="h-full rounded-none border-0 shadow-none"
                  onSend={(body) =>
                    sendCoachMessage(activeConversation.clientId, body)
                  }
                  onSendVoice={(formData) =>
                    sendCoachVoiceMessage(activeConversation.clientId, formData)
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
