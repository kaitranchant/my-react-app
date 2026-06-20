'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send } from 'lucide-react'
import { toast } from 'sonner'

import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { formatMessageTimestamp } from '@/lib/messages'
import { cn } from '@/lib/utils'
import type { ClientMessage, MessageSenderRole } from 'app/types/database'

type ClientMessagesPanelProps = {
  variant: MessageSenderRole
  clientName: string
  messages: ClientMessage[]
  schemaError?: string | null
  showHeader?: boolean
  className?: string
  onSend: (body: string) => Promise<{ success: true } | { success: false; error: string }>
  onMarkRead: () => Promise<{ success: true } | { success: false; error: string }>
}

export function ClientMessagesPanel({
  variant,
  clientName,
  messages,
  schemaError = null,
  showHeader = true,
  className,
  onSend,
  onMarkRead,
}: ClientMessagesPanelProps) {
  const router = useRouter()
  const [body, setBody] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const markedReadRef = React.useRef(false)

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
      setBody('')
      router.refresh()
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
          <CardTitle className="text-sm font-medium">Messages</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
      )}

      <CardContent className="flex h-full flex-col gap-0 p-0">
        <div
          ref={scrollRef}
          className="flex max-h-[min(28rem,55vh)] min-h-64 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4"
        >
          {messages.length === 0 ? (
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-sm">
              <MessageSquare className="size-8 opacity-40" />
              <p>No messages yet. Start the conversation below.</p>
            </div>
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
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
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

        <form
          className="flex items-end gap-2 border-t px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSend()
          }}
        >
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
