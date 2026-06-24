import type { SupabaseClient } from '@supabase/supabase-js'

import {
  MESSAGE_MEDIA_BUCKET,
  MESSAGE_VOICE_MAX_BYTES,
  messageMediaStoragePath,
  resolveMessageVoiceContentType,
} from '@/lib/message-media'
import { messageCaptionSchema } from '@/lib/validations/message'
import type { ClientMessage, MessageSenderRole } from 'app/types/database'

export type VoiceMessageUploadResult =
  | { success: true; message: ClientMessage }
  | { success: false; error: string }

type UploadVoiceMessageParams = {
  supabase: SupabaseClient
  clientId: string
  coachId: string
  senderId: string
  senderRole: MessageSenderRole
  formData: FormData
  broadcastId?: string | null
}

export async function uploadVoiceMessage(
  params: UploadVoiceMessageParams
): Promise<VoiceMessageUploadResult> {
  const file = params.formData.get('file')
  const captionRaw = params.formData.get('caption')
  const durationRaw = params.formData.get('durationSeconds')

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

  const caption =
    typeof captionRaw === 'string' && captionRaw.trim()
      ? messageCaptionSchema.safeParse(captionRaw)
      : { success: true as const, data: null }

  if (!caption.success) {
    return {
      success: false,
      error: caption.error.issues[0]?.message ?? 'Invalid caption.',
    }
  }

  const durationSeconds =
    typeof durationRaw === 'string' && durationRaw.trim()
      ? Number.parseFloat(durationRaw)
      : null

  const messageId = crypto.randomUUID()
  const storagePath = messageMediaStoragePath(
    params.clientId,
    messageId,
    contentType
  )

  const { data: inserted, error: insertError } = await params.supabase
    .from('client_messages')
    .insert({
      id: messageId,
      client_id: params.clientId,
      coach_id: params.coachId,
      sender_id: params.senderId,
      sender_role: params.senderRole,
      message_type: 'voice',
      body: caption.data,
      storage_path: storagePath,
      content_type: contentType,
      media_duration_seconds:
        durationSeconds != null && Number.isFinite(durationSeconds)
          ? durationSeconds
          : null,
      broadcast_id: params.broadcastId ?? null,
    })
    .select('*')
    .single()

  if (insertError || !inserted) {
    return {
      success: false,
      error: insertError?.message ?? 'Failed to save voice message.',
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await params.supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .upload(storagePath, buffer, {
      upsert: false,
      contentType,
      cacheControl: '3600',
    })

  if (uploadError) {
    await params.supabase.from('client_messages').delete().eq('id', messageId)
    const message = uploadError.message.toLowerCase()
    if (message.includes('bucket')) {
      return {
        success: false,
        error:
          'Message media storage is not set up. Run yarn db:push or apply message media migration.',
      }
    }
    return { success: false, error: uploadError.message }
  }

  return { success: true, message: inserted as ClientMessage }
}
