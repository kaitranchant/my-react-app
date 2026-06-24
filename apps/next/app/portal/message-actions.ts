'use server'

import { revalidatePath } from 'next/cache'

import { notifyCoachOfClientMessage } from '@/lib/notifications/notify-coach-client-message'
import { requirePortalClientContext } from '@/lib/portal-client'
import { uploadVoiceMessage } from '@/lib/voice-message-upload'
import { messageBodySchema } from '@/lib/validations/message'

export type ActionResult = { success: true } | { success: false; error: string }

function revalidateMessagePaths(clientId: string) {
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/messages')
  revalidatePath('/portal/messages')
  revalidatePath('/portal', 'layout')
}

export async function sendPortalMessage(body: string): Promise<ActionResult> {
  const parsed = messageBodySchema.safeParse(body)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid message.' }
  }

  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: client, error: clientError } = await ctx.supabase
    .from('clients')
    .select('id, coach_id, full_name')
    .eq('id', ctx.client.id)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client account not found.' }
  }

  const { error } = await ctx.supabase.from('client_messages').insert({
    client_id: client.id,
    coach_id: client.coach_id,
    sender_id: ctx.userId,
    sender_role: 'client',
    message_type: 'text',
    body: parsed.data,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  void notifyCoachOfClientMessage({
    coachId: client.coach_id,
    clientId: client.id,
    clientName: client.full_name?.trim() || 'Client',
    messagePreview: parsed.data,
  })

  revalidateMessagePaths(client.id)
  return { success: true }
}

export async function sendPortalVoiceMessage(
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: client, error: clientError } = await ctx.supabase
    .from('clients')
    .select('id, coach_id, full_name')
    .eq('id', ctx.client.id)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client account not found.' }
  }

  const result = await uploadVoiceMessage({
    supabase: ctx.supabase,
    clientId: client.id,
    coachId: client.coach_id,
    senderId: ctx.userId,
    senderRole: 'client',
    formData,
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  void notifyCoachOfClientMessage({
    coachId: client.coach_id,
    clientId: client.id,
    clientName: client.full_name?.trim() || 'Client',
    messagePreview: 'Voice message',
  })

  revalidateMessagePaths(client.id)
  return { success: true }
}

export async function markPortalMessagesRead(): Promise<ActionResult> {
  const ctx = await requirePortalClientContext()
  if ('error' in ctx) {
    return { success: false, error: ctx.error }
  }

  const { data: client, error: clientError } = await ctx.supabase
    .from('clients')
    .select('id, coach_id, full_name')
    .eq('id', ctx.client.id)
    .maybeSingle()

  if (clientError || !client) {
    return { success: false, error: 'Client account not found.' }
  }

  const now = new Date().toISOString()
  const { error } = await ctx.supabase.from('client_message_threads').upsert(
    {
      client_id: client.id,
      coach_id: client.coach_id,
      client_last_read_at: now,
    },
    { onConflict: 'client_id' }
  )

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateMessagePaths(client.id)
  return { success: true }
}
