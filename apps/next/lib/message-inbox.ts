import { cache } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Client,
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

type LatestMessageRow = {
  client_id: string
  body: string | null
  sender_role: MessageSenderRole
  created_at: string
  message_type: ClientMessageType
}

type UnreadByClientRow = {
  client_id: string
  unread_count: number
}

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

function isMissingMessagingSchema(errorMessage: string | null | undefined) {
  return Boolean(errorMessage?.includes('Could not find the table'))
}

async function fetchCoachInboxUnreadCountImpl(
  supabase: SupabaseClient<Database>,
  coachId: string
): Promise<number> {
  const { data, error } = await supabase.rpc('count_coach_unread_messages', {
    p_coach_id: coachId,
  })

  if (error) {
    if (isMissingMessagingSchema(error.message)) {
      return 0
    }
    return 0
  }

  return Number(data ?? 0)
}

export const fetchCoachInboxUnreadCount = cache(fetchCoachInboxUnreadCountImpl)

export async function fetchCoachInboxUnreadByClient(
  supabase: SupabaseClient<Database>,
  coachId: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('get_coach_unread_by_client', {
    p_coach_id: coachId,
  })

  if (error || !data) {
    return new Map()
  }

  return new Map(
    (data as UnreadByClientRow[]).map((row) => [
      row.client_id,
      Number(row.unread_count),
    ])
  )
}

async function fetchCoachInboxImpl(
  supabase: SupabaseClient<Database>,
  coachId: string
): Promise<CoachInboxData> {
  const [
    { data: clientsData, error: clientsError },
    { data: threadsData, error: threadsError },
    { data: latestMessagesData, error: latestMessagesError },
    { data: unreadByClientData, error: unreadByClientError },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, avatar_url')
      .eq('coach_id', coachId)
      .eq('status', 'active')
      .order('full_name', { ascending: true }),
    supabase
      .from('client_message_threads')
      .select('client_id, coach_last_read_at, last_message_at')
      .eq('coach_id', coachId),
    supabase.rpc('get_coach_latest_messages', { p_coach_id: coachId }),
    supabase.rpc('get_coach_unread_by_client', { p_coach_id: coachId }),
  ])

  const schemaError =
    clientsError?.message ??
    threadsError?.message ??
    latestMessagesError?.message ??
    unreadByClientError?.message ??
    null

  if (isMissingMessagingSchema(schemaError)) {
    return { conversations: [], schemaError, totalUnread: 0 }
  }

  const clients = (clientsData ?? []) as ClientRow[]
  const threads = (threadsData ?? []) as Pick<
    ClientMessageThread,
    'client_id' | 'coach_last_read_at' | 'last_message_at'
  >[]
  const latestMessages = (latestMessagesData ?? []) as LatestMessageRow[]
  const unreadRows = (unreadByClientData ?? []) as UnreadByClientRow[]

  const threadsByClientId = new Map(
    threads.map((thread) => [thread.client_id, thread])
  )
  const latestByClientId = new Map(
    latestMessages.map((message) => [message.client_id, message])
  )
  const unreadByClientId = new Map(
    unreadRows.map((row) => [row.client_id, Number(row.unread_count)])
  )

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

export const fetchCoachInbox = cache(fetchCoachInboxImpl)

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
