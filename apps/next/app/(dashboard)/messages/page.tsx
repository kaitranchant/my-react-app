import { Suspense } from 'react'

import { CoachInboxPanelSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { PageHeader } from '@/components/dashboard/page-header'
import { CoachInboxPanel } from '@/components/messages/coach-inbox-panel'
import {
  fetchCoachInbox,
  getDefaultInboxClientId,
} from '@/lib/message-inbox'
import { attachSignedUrlsToMessages } from '@/lib/message-media'
import { fetchCoachMessageTemplates } from '@/lib/message-templates'
import { createClient } from '@/lib/supabase/server'
import type { ClientMessage, ClientMessageWithUrl } from 'app/types/database'

export const metadata = {
  title: 'Inbox — Coaching App',
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client: selectedClientId = null } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const inbox = await fetchCoachInbox(supabase, user.id)
  const { templates: messageTemplates } = await fetchCoachMessageTemplates(
    supabase,
    user.id
  )
  const defaultClientId = getDefaultInboxClientId(inbox.conversations)
  const activeClientId = selectedClientId ?? defaultClientId

  let messages: ClientMessageWithUrl[] = []
  let messagesError: string | null = null

  if (
    activeClientId &&
    inbox.conversations.some(
      (conversation) => conversation.clientId === activeClientId
    )
  ) {
    const { data, error } = await supabase
      .from('client_messages')
      .select('*')
      .eq('client_id', activeClientId)
      .order('created_at', { ascending: true })
      .limit(200)

    messages = await attachSignedUrlsToMessages(
      supabase,
      (data ?? []) as ClientMessage[]
    )
    messagesError = error?.message ?? null
  }

  const schemaError = inbox.schemaError ?? messagesError

  const { data: broadcastClientsData } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('coach_id', user.id)
    .eq('status', 'active')
    .order('full_name', { ascending: true })

  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, team_members(client_id)')
    .eq('coach_id', user.id)
    .order('name', { ascending: true })

  const broadcastClients =
    broadcastClientsData?.map((client) => ({
      id: client.id,
      name: client.full_name,
    })) ?? []

  const broadcastTeams =
    teamsData?.map((team) => ({
      id: team.id,
      name: team.name,
      clientIds:
        (
          team.team_members as { client_id: string }[] | null | undefined
        )?.map((member) => member.client_id) ?? [],
    })) ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Inbox"
        description="All your client conversations in one place. Reply here or from a client's profile."
      >
        {inbox.totalUnread > 0 && (
          <span className="bg-brand/10 text-brand rounded-full px-3 py-1 text-xs font-medium">
            {inbox.totalUnread} unread
          </span>
        )}
      </PageHeader>

      <Suspense fallback={<CoachInboxPanelSkeleton />}>
        <CoachInboxPanel
          coachId={user.id}
          conversations={inbox.conversations}
          defaultClientId={defaultClientId}
          selectedClientId={selectedClientId}
          messages={messages}
          messageTemplates={messageTemplates}
          broadcastClients={broadcastClients}
          broadcastTeams={broadcastTeams}
          schemaError={schemaError}
        />
      </Suspense>
    </div>
  )
}
