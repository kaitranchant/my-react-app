'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { requireClientAccess } from '@/lib/gym-access'
import { notifyClientOfCoachMessage } from '@/lib/notifications/notify-client-coach-message'
import { messageBodySchema } from '@/lib/validations/message'

export type ActionResult = { success: true } | { success: false; error: string }

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

  const ctx = await requireClientAccess(clientId)
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

  void notifyClientOfCoachMessage({
    clientId: client.id,
    coachId: client.coach_id,
    messageBody: parsed.data,
  })

  revalidateMessagePaths(clientId)
  return { success: true }
}

export async function markCoachMessagesRead(
  clientId: string
): Promise<ActionResult> {
  const ctx = await requireClientAccess(clientId)
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
