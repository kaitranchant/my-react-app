import type { SupabaseClient } from '@supabase/supabase-js'

import type { ClientMessage, ClientMessageWithUrl } from 'app/types/database'

export const MESSAGE_MEDIA_BUCKET = 'message-media'
export const MESSAGE_VOICE_MAX_BYTES = 2 * 1024 * 1024
export const MESSAGE_VOICE_MAX_DURATION_SECONDS = 120
export const MESSAGE_SIGNED_URL_TTL_SECONDS = 3600

export const MESSAGE_VOICE_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
] as const

export type MessageVoiceMimeType = (typeof MESSAGE_VOICE_MIME_TYPES)[number]

const MIME_TO_EXTENSION: Record<MessageVoiceMimeType, string> = {
  'audio/webm': '.webm',
  'audio/mp4': '.m4a',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
}

const EXTENSION_TO_MIME: Record<string, MessageVoiceMimeType> = {
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  ogg: 'audio/ogg',
}

export function isMessageVoiceMimeType(
  value: string
): value is MessageVoiceMimeType {
  return MESSAGE_VOICE_MIME_TYPES.includes(value as MessageVoiceMimeType)
}

export function resolveMessageVoiceContentType(
  file: Pick<File, 'name' | 'type'>
): MessageVoiceMimeType | null {
  const normalizedType = file.type.trim()
  if (normalizedType && isMessageVoiceMimeType(normalizedType)) {
    return normalizedType
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension) return null

  return EXTENSION_TO_MIME[extension] ?? null
}

export function messageMediaStoragePath(
  clientId: string,
  messageId: string,
  contentType: string
) {
  const extension = isMessageVoiceMimeType(contentType)
    ? MIME_TO_EXTENSION[contentType]
    : '.webm'
  return `${clientId}/${messageId}${extension}`
}

export function getMessagePreviewText(
  message: Pick<ClientMessage, 'message_type' | 'body'>
): string {
  if (message.message_type === 'voice') {
    return message.body?.trim() || 'Voice message'
  }
  return message.body?.trim() || ''
}

export async function attachSignedUrlsToMessages(
  supabase: SupabaseClient,
  messages: ClientMessage[]
): Promise<ClientMessageWithUrl[]> {
  if (messages.length === 0) {
    return []
  }

  return Promise.all(
    messages.map(async (message) => {
      if (!message.storage_path) {
        return { ...message, signedUrl: null }
      }

      const { data, error } = await supabase.storage
        .from(MESSAGE_MEDIA_BUCKET)
        .createSignedUrl(message.storage_path, MESSAGE_SIGNED_URL_TTL_SECONDS)

      return {
        ...message,
        signedUrl: error ? null : (data?.signedUrl ?? null),
      }
    })
  )
}

export function isVoiceRecordingSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  )
}
