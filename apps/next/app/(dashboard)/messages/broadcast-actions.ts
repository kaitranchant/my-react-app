'use server'

import { revalidatePath } from 'next/cache'

import {
  MESSAGE_MEDIA_BUCKET,
  MESSAGE_VOICE_MAX_BYTES,
  resolveMessageVoiceContentType,
} from '@/lib/message-media'
import { notifyClientOfCoachMessage } from '@/lib/notifications/notify-client-coach-message'
import { createClient } from '@/lib/supabase/server'
import {
  broadcastRecipientsSchema,
  messageBodySchema,
} from '@/lib/validations/message'

export type ActionResult = { success: true } | { success: false; error: string }

function revalidateBroadcastPaths() {
  revalidatePath('/messages')
  revalidatePath('/portal/messages')
  revalidatePath('/portal', 'layout')
}

export async function sendCoachBroadcast(
  recipientClientIds: string[],
  body: string
): Promise<ActionResult> {
  const recipientsParsed = broadcastRecipientsSchema.safeParse(recipientClientIds)
  if (!recipientsParsed.success) {
    return {
      success: false,
      error: recipientsParsed.error.issues[0]?.message ?? 'Invalid recipients.',
    }
  }

  const bodyParsed = messageBodySchema.safeParse(body)
  if (!bodyParsed.success) {
    return {
      success: false,
      error: bodyParsed.error.issues[0]?.message ?? 'Invalid message.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const uniqueRecipientIds = Array.from(new Set(recipientsParsed.data))
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, coach_id')
    .in('id', uniqueRecipientIds)
    .eq('coach_id', user.id)

  if (clientsError) {
    return { success: false, error: clientsError.message }
  }

  if (!clients || clients.length !== uniqueRecipientIds.length) {
    return { success: false, error: 'One or more clients could not be found.' }
  }

  const { data: broadcast, error: broadcastError } = await supabase
    .from('coach_broadcasts')
    .insert({
      coach_id: user.id,
      sender_id: user.id,
      message_type: 'text',
      body: bodyParsed.data,
    })
    .select('id')
    .single()

  if (broadcastError || !broadcast) {
    return {
      success: false,
      error: broadcastError?.message ?? 'Failed to create broadcast.',
    }
  }

  const rows = clients.map((client) => ({
    client_id: client.id,
    coach_id: client.coach_id,
    sender_id: user.id,
    sender_role: 'coach' as const,
    message_type: 'text' as const,
    body: bodyParsed.data,
    broadcast_id: broadcast.id,
  }))

  const { error: insertError } = await supabase.from('client_messages').insert(rows)

  if (insertError) {
    await supabase.from('coach_broadcasts').delete().eq('id', broadcast.id)
    return { success: false, error: insertError.message }
  }

  await Promise.all(
    clients.map((client) =>
      notifyClientOfCoachMessage({
        clientId: client.id,
        coachId: client.coach_id,
        messageBody: bodyParsed.data,
      })
    )
  )

  revalidateBroadcastPaths()
  return { success: true }
}

export async function sendCoachVoiceBroadcast(
  recipientClientIds: string[],
  formData: FormData
): Promise<ActionResult> {
  const recipientsParsed = broadcastRecipientsSchema.safeParse(recipientClientIds)
  if (!recipientsParsed.success) {
    return {
      success: false,
      error: recipientsParsed.error.issues[0]?.message ?? 'Invalid recipients.',
    }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'No voice recording provided.' }
  }

  const contentType = resolveMessageVoiceContentType(file)
  if (!contentType) {
    return {
      success: false,
      error: 'Unsupported audio format. Use WebM, MP4, MP3, or OGG.',
    }
  }

  if (file.size > MESSAGE_VOICE_MAX_BYTES) {
    return { success: false, error: 'Voice notes must be under 2 MB.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  const uniqueRecipientIds = Array.from(new Set(recipientsParsed.data))
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, coach_id')
    .in('id', uniqueRecipientIds)
    .eq('coach_id', user.id)

  if (clientsError) {
    return { success: false, error: clientsError.message }
  }

  if (!clients || clients.length !== uniqueRecipientIds.length) {
    return { success: false, error: 'One or more clients could not be found.' }
  }

  const captionRaw = formData.get('caption')
  const durationRaw = formData.get('durationSeconds')
  const caption =
    typeof captionRaw === 'string' && captionRaw.trim() ? captionRaw.trim() : null
  const durationSeconds =
    typeof durationRaw === 'string' && durationRaw.trim()
      ? Number.parseFloat(durationRaw)
      : null

  const broadcastId = crypto.randomUUID()
  const extension =
    contentType === 'audio/mpeg'
      ? '.mp3'
      : contentType === 'audio/mp4'
        ? '.m4a'
        : contentType === 'audio/ogg'
          ? '.ogg'
          : '.webm'
  const sharedStoragePath = `broadcasts/${user.id}/${broadcastId}${extension}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .upload(sharedStoragePath, buffer, {
      upsert: false,
      contentType,
      cacheControl: '3600',
    })

  if (uploadError) {
    return { success: false, error: uploadError.message }
  }

  const { error: broadcastError } = await supabase.from('coach_broadcasts').insert({
    id: broadcastId,
    coach_id: user.id,
    sender_id: user.id,
    message_type: 'voice',
    body: caption,
    storage_path: sharedStoragePath,
    content_type: contentType,
    media_duration_seconds:
      durationSeconds != null && Number.isFinite(durationSeconds)
        ? durationSeconds
        : null,
  })

  if (broadcastError) {
    await supabase.storage.from(MESSAGE_MEDIA_BUCKET).remove([sharedStoragePath])
    return { success: false, error: broadcastError.message }
  }

  const preview = caption || 'Voice message'
  const rows = clients.map((client) => ({
    id: crypto.randomUUID(),
    client_id: client.id,
    coach_id: client.coach_id,
    sender_id: user.id,
    sender_role: 'coach' as const,
    message_type: 'voice' as const,
    body: caption,
    storage_path: sharedStoragePath,
    content_type: contentType,
    media_duration_seconds:
      durationSeconds != null && Number.isFinite(durationSeconds)
        ? durationSeconds
        : null,
    broadcast_id: broadcastId,
  }))

  const { error: insertError } = await supabase.from('client_messages').insert(rows)

  if (insertError) {
    await supabase.from('coach_broadcasts').delete().eq('id', broadcastId)
    await supabase.storage.from(MESSAGE_MEDIA_BUCKET).remove([sharedStoragePath])
    return { success: false, error: insertError.message }
  }

  await Promise.all(
    clients.map((client) =>
      notifyClientOfCoachMessage({
        clientId: client.id,
        coachId: client.coach_id,
        messageBody: preview,
      })
    )
  )

  revalidateBroadcastPaths()
  return { success: true }
}
