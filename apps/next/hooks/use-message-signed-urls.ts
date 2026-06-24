'use client'

import * as React from 'react'

import {
  MESSAGE_MEDIA_BUCKET,
  MESSAGE_SIGNED_URL_TTL_SECONDS,
} from '@/lib/message-media'
import { createClient } from '@/lib/supabase/client'
import type { ClientMessage, ClientMessageWithUrl } from 'app/types/database'

export function useMessageSignedUrls(
  messages: ClientMessage[],
  initialSignedUrls: Record<string, string | null> = {}
) {
  const [signedUrls, setSignedUrls] =
    React.useState<Record<string, string | null>>(initialSignedUrls)

  React.useEffect(() => {
    const next: Record<string, string | null> = {}
    for (const message of messages) {
      if (message.storage_path && initialSignedUrls[message.id] !== undefined) {
        next[message.id] = initialSignedUrls[message.id]
      }
    }
    setSignedUrls((current) => ({ ...current, ...next }))
  }, [messages, initialSignedUrls])

  React.useEffect(() => {
    const missing = messages.filter(
      (message) =>
        message.storage_path &&
        signedUrls[message.id] === undefined &&
        initialSignedUrls[message.id] === undefined
    )
    if (missing.length === 0) return

    const supabase = createClient()
    let cancelled = false

    void Promise.all(
      missing.map(async (message) => {
        if (!message.storage_path) return

        const { data, error } = await supabase.storage
          .from(MESSAGE_MEDIA_BUCKET)
          .createSignedUrl(
            message.storage_path,
            MESSAGE_SIGNED_URL_TTL_SECONDS
          )

        if (cancelled) return

        setSignedUrls((current) => {
          if (current[message.id] !== undefined) return current
          return {
            ...current,
            [message.id]: error ? null : (data?.signedUrl ?? null),
          }
        })
      })
    )

    return () => {
      cancelled = true
    }
  }, [messages, initialSignedUrls, signedUrls])

  const messagesWithUrls: ClientMessageWithUrl[] = messages.map((message) => ({
    ...message,
    signedUrl: message.storage_path ? (signedUrls[message.id] ?? null) : null,
  }))

  return messagesWithUrls
}
