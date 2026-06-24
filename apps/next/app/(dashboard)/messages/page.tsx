import { Suspense } from 'react'

import { CoachInboxPanelSkeleton } from '@/components/dashboard/async-fallback-skeletons'
import { PageHeader } from '@/components/dashboard/page-header'
import { CoachInboxPanel } from '@/components/messages/coach-inbox-panel'
import {
  fetchCoachInbox,
  getDefaultInboxClientId,
} from '@/lib/message-inbox'
import { createClient } from '@/lib/supabase/server'
import type { ClientMessage } from 'app/types/database'

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
  const defaultClientId = getDefaultInboxClientId(inbox.conversations)
  const activeClientId = selectedClientId ?? defaultClientId

  let messages: ClientMessage[] = []
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

    messages = (data ?? []) as ClientMessage[]
    messagesError = error?.message ?? null
  }

  const schemaError = inbox.schemaError ?? messagesError

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
          conversations={inbox.conversations}
          defaultClientId={defaultClientId}
          selectedClientId={selectedClientId}
          messages={messages}
          schemaError={schemaError}
        />
      </Suspense>
    </div>
  )
}
