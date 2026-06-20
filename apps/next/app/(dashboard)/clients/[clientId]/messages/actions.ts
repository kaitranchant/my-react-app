'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { messageBodySchema } from '@/lib/validations/message'

export type ActionResult = { success: true } | { success: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('You must be signed in.')
  }
  return { supabase, user }
}

async function requireCoachClient(clientId: string) {
  const { supabase, user } = await requireUser()
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, coach_id, full_name')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .maybeSingle()

  if (error || !client) {
    return null
  }

  return { supabase, user, client }
}

function revalidateMessagePaths(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/messages')
  revalidatePath('/portal/messages')
  revalidatePath('/portal', 'layout')
}

export async function sendCoachMessage(
  clientId: string,
  body: string
): Promise<ActionResult> {
  const parsed = messageBodySchema.safeParse(body)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid message.' }
  }

  const ctx = await requireCoachClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, user, client } = ctx
  const { error } = await supabase.from('client_messages').insert({
    client_id: client.id,
    coach_id: client.coach_id,
    sender_id: user.id,
    sender_role: 'coach',
    body: parsed.data,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMessagePaths(clientId)
  return { success: true }
}

export async function markCoachMessagesRead(
  clientId: string
): Promise<ActionResult> {
  const ctx = await requireCoachClient(clientId)
  if (!ctx) {
    return { success: false, error: 'Client not found.' }
  }

  const { supabase, client } = ctx
  const now = new Date().toISOString()
  const { error } = await supabase.from('client_message_threads').upsert(
    {
      client_id: client.id,
      coach_id: client.coach_id,
      coach_last_read_at: now,
    },
    { onConflict: 'client_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMessagePaths(clientId)
  return { success: true }
}
