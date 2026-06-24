'use client'

import * as React from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'

import { MessageTemplatePicker } from '@/components/message-templates/message-template-picker'
import { VoiceNotePlayer } from '@/components/messages/voice-note-player'
import { VoiceNoteRecorder } from '@/components/messages/voice-note-recorder'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Textarea } from '@/components/ui/textarea'
import { useClientMessagesRealtime } from '@/hooks/use-client-messages-realtime'
import { useMessageSignedUrls } from '@/hooks/use-message-signed-urls'
import { formatMessageTimestamp } from '@/lib/messages'
import { cn } from '@/lib/utils'
import type {
  ClientMessage,
  ClientMessageWithUrl,
  CoachMessageTemplate,
  MessageSenderRole,
} from 'app/types/database'

type ClientMessagesPanelProps = {
  variant: MessageSenderRole
  clientId: string
  clientName: string
  messages: ClientMessageWithUrl[]
  messageTemplates?: CoachMessageTemplate[]
  schemaError?: string | null
  showHeader?: boolean
  className?: string
  onSend: (body: string) => Promise<{ success: true } | { success: false; error: string }>
  onSendVoice: (
    formData: FormData
  ) => Promise<{ success: true } | { success: false; error: string }>
  onMarkRead: () => Promise<{ success: true } | { success: false; error: string }>
}

export function ClientMessagesPanel({
  variant,
  clientId,
  clientName,
  messages: initialMessages,
  messageTemplates = [],
  schemaError = null,
  showHeader = true,
  className,
  onSend,
  onSendVoice,
  onMarkRead,
}: ClientMessagesPanelProps) {
  const [body, setBody] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const markedReadRef = React.useRef(false)

  const realtimeMessages = useClientMessagesRealtime(
    clientId,
    initialMessages as ClientMessage[]
  )

  const initialSignedUrls = React.useMemo(
    () =>
      Object.fromEntries(
        initialMessages.map((message) => [message.id, message.signedUrl ?? null])
      ),
    [initialMessages]
  )

  const messages = useMessageSignedUrls(realtimeMessages, initialSignedUrls)

  React.useEffect(() => {
    if (markedReadRef.current) return
    markedReadRef.current = true
    void onMarkRead()
  }, [onMarkRead])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages.length])

  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    const result = await onSend(trimmed)
    setIsSending(false)

    if (result.success) {
      toast.success('Message sent')
      setBody('')
    } else {
      toast.error(result.error)
    }
  }

  async function handleVoiceRecorded(file: File, durationSeconds: number) {
    if (isSending) return

    setIsSending(true)
    const formData = new FormData()
    formData.set('file', file)
    formData.set('durationSeconds', String(durationSeconds))
    const caption = body.trim()
    if (caption) {
      formData.set('caption', caption)
    }

    const result = await onSendVoice(formData)
    setIsSending(false)

    if (result.success) {
      toast.success('Voice note sent')
      setBody('')
    } else {
      toast.error(result.error)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  if (schemaError?.includes('Could not find the table')) {
    return (
      <SchemaSetupNotice
        tables={['client_messages', 'client_message_threads']}
        sqlFile="apply-client-messages.sql"
      />
    )
  }

  const subtitle =
    variant === 'coach'
      ? `Direct conversation with ${clientName}.`
      : 'Message your coach with questions, updates, or feedback.'

  return (
    <Card className={cn('gap-0 overflow-hidden py-0', className)}>
      {showHeader && (
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-muted-foreground">Messages</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
      )}

      <CardContent className="flex h-full flex-col gap-0 p-0">
        <div
          ref={scrollRef}
          className="flex max-h-[min(28rem,55vh)] min-h-64 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
        >
          {messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No messages yet"
              description={
                variant === 'coach'
                  ? `Send ${clientName} a note to start the conversation.`
                  : 'Send your coach a question, update, or feedback.'
              }
              className="flex-1 py-10"
            />
          ) : (
            messages.map((message) => {
              const isOwn = message.sender_role === variant
              return (
                <div
                  key={message.id}
                  className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      isOwn
                        ? 'bg-brand text-brand-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}
                  >
                    {message.message_type === 'voice' ? (
                      <VoiceNotePlayer
                        signedUrl={message.signedUrl}
                        durationSeconds={message.media_duration_seconds}
                        className={isOwn ? 'text-brand-foreground' : undefined}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                    )}
                    {message.message_type === 'voice' && message.body ? (
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs opacity-90">
                        {message.body}
                      </p>
                    ) : null}
                    <p
                      className={cn(
                        'mt-1 text-[11px]',
                        isOwn ? 'text-brand-foreground/75' : 'text-muted-foreground'
                      )}
                    >
                      {formatMessageTimestamp(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {variant === 'coach' && (
          <MessageTemplatePicker
            templates={messageTemplates}
            clientName={clientName}
            onInsert={setBody}
          />
        )}

        <form
          className="flex items-end gap-2 border-t px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSend()
          }}
        >
          <VoiceNoteRecorder
            disabled={isSending}
            onRecorded={(file, durationSeconds) =>
              void handleVoiceRecorded(file, durationSeconds)
            }
          />
          <Textarea
            rows={2}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message…"
            className="min-h-0 resize-none"
            disabled={isSending}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0"
            disabled={!body.trim() || isSending}
            title="Send message"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
