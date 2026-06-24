import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Client,
  ClientMessage,
  ClientMessageThread,
  ClientMessageType,
  Database,
  MessageSenderRole,
} from 'app/types/database'

import { getMessagePreviewText } from '@/lib/message-media'

export type InboxConversation = {
  clientId: string
  clientName: string
  avatarUrl: string | null
  lastMessageAt: string | null
  lastMessageBody: string | null
  lastMessageSenderRole: MessageSenderRole | null
  lastMessageType: ClientMessageType | null
  unreadCount: number
}

export type CoachInboxData = {
  conversations: InboxConversation[]
  schemaError: string | null
  totalUnread: number
}

type ClientRow = Pick<Client, 'id' | 'full_name' | 'avatar_url'>

function truncatePreview(body: string, maxLength = 72) {
  const normalized = body.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

export function formatInboxPreview(
  body: string | null,
  senderRole: MessageSenderRole | null,
  messageType: ClientMessageType | null = 'text'
) {
  if (!body && messageType !== 'voice') return 'No messages yet'
  const preview =
    messageType === 'voice' ? body?.trim() || 'Voice message' : body ?? ''
  if (!preview) return 'No messages yet'
  const prefix = senderRole === 'coach' ? 'You: ' : ''
  return truncatePreview(`${prefix}${preview}`)
}

export function sortInboxConversations(
  conversations: InboxConversation[]
): InboxConversation[] {
  return [...conversations].sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1
    if (b.unreadCount > 0 && a.unreadCount === 0) return 1

    if (a.lastMessageAt && b.lastMessageAt) {
      return (
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      )
    }
    if (a.lastMessageAt) return -1
    if (b.lastMessageAt) return 1

    return a.clientName.localeCompare(b.clientName)
  })
}

export async function fetchCoachInbox(
  supabase: SupabaseClient<Database>,
  coachId: string
): Promise<CoachInboxData> {
  const [
    { data: clientsData, error: clientsError },
    { data: threadsData, error: threadsError },
    { data: messagesData, error: messagesError },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, avatar_url')
      .eq('coach_id', coachId)
      .eq('status', 'active')
      .order('full_name', { ascending: true }),
    supabase
      .from('client_message_threads')
      .select('*')
      .eq('coach_id', coachId),
    supabase
      .from('client_messages')
      .select('client_id, body, sender_role, created_at, message_type')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(500),
  ])

  const schemaError =
    clientsError?.message ??
    threadsError?.message ??
    messagesError?.message ??
    null

  if (schemaError?.includes('Could not find the table')) {
    return { conversations: [], schemaError, totalUnread: 0 }
  }

  const clients = (clientsData ?? []) as ClientRow[]
  const threads = (threadsData ?? []) as ClientMessageThread[]
  const messages = (messagesData ?? []) as Pick<
    ClientMessage,
    'client_id' | 'body' | 'sender_role' | 'created_at' | 'message_type'
  >[]

  const threadsByClientId = new Map(
    threads.map((thread) => [thread.client_id, thread])
  )

  const latestByClientId = new Map<
    string,
    Pick<
      ClientMessage,
      'body' | 'sender_role' | 'created_at' | 'message_type'
    >
  >()
  const unreadByClientId = new Map<string, number>()

  for (const message of messages) {
    if (!latestByClientId.has(message.client_id)) {
      latestByClientId.set(message.client_id, message)
    }

    if (message.sender_role !== 'client') continue

    const thread = threadsByClientId.get(message.client_id)
    const lastReadAt = thread?.coach_last_read_at
      ? new Date(thread.coach_last_read_at).getTime()
      : 0
    const messageAt = new Date(message.created_at).getTime()

    if (messageAt > lastReadAt) {
      unreadByClientId.set(
        message.client_id,
        (unreadByClientId.get(message.client_id) ?? 0) + 1
      )
    }
  }

  const conversations = clients.map((client) => {
    const thread = threadsByClientId.get(client.id)
    const latest = latestByClientId.get(client.id)

    return {
      clientId: client.id,
      clientName: client.full_name,
      avatarUrl: client.avatar_url,
      lastMessageAt: thread?.last_message_at ?? latest?.created_at ?? null,
      lastMessageBody: latest
        ? getMessagePreviewText({
            message_type: latest.message_type ?? 'text',
            body: latest.body,
          })
        : null,
      lastMessageSenderRole: latest?.sender_role ?? null,
      lastMessageType: latest?.message_type ?? null,
      unreadCount: unreadByClientId.get(client.id) ?? 0,
    }
  })

  const sorted = sortInboxConversations(conversations)
  const totalUnread = sorted.reduce(
    (sum, conversation) => sum + conversation.unreadCount,
    0
  )

  return {
    conversations: sorted,
    schemaError,
    totalUnread,
  }
}

export function getDefaultInboxClientId(
  conversations: InboxConversation[]
): string | null {
  const withUnread = conversations.find(
    (conversation) => conversation.unreadCount > 0
  )
  if (withUnread) return withUnread.clientId

  const withMessages = conversations.find(
    (conversation) => conversation.lastMessageAt
  )
  if (withMessages) return withMessages.clientId

  return conversations[0]?.clientId ?? null
}
