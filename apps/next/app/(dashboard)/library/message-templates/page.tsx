import Link from 'next/link'
import { MessageSquareText } from 'lucide-react'

import { AddMessageTemplateButton } from '@/components/message-templates/message-template-form-dialog'
import { MessageTemplateRowActions } from '@/components/message-templates/message-template-row-actions'
import { LibraryLoadError } from '@/components/library/schema-setup-notice'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createClient } from '@/lib/supabase/server'
import type { CoachMessageTemplate } from 'app/types/database'

export const metadata = {
  title: 'Message templates — Library — Coaching App',
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncateBody(body: string, maxLength = 120) {
  if (body.length <= maxLength) return body
  return `${body.slice(0, maxLength).trimEnd()}…`
}

export default async function LibraryMessageTemplatesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data, error } = await supabase
    .from('coach_message_templates')
    .select('*')
    .eq('coach_id', user.id)
    .order('name', { ascending: true })

  const templates = (data ?? []) as CoachMessageTemplate[]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Reusable messages for client conversations — pick a template when
          composing in your inbox or on a client profile.
        </p>
        <AddMessageTemplateButton />
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <CardTitle className="text-muted-foreground">
            {templates.length} template{templates.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <LibraryLoadError resource="message templates" error={error} />
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="empty-state-icon">
                <MessageSquareText className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No message templates yet</p>
                <p className="text-muted-foreground max-w-sm text-sm">
                  Save your go-to check-ins, reminders, and follow-ups so you
                  don&apos;t have to retype them.
                </p>
              </div>
              <div className="pt-2">
                <AddMessageTemplateButton />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-4 md:hidden">
                {templates.map((template) => (
                  <Card key={template.id} className="py-0">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-medium">{template.name}</p>
                          <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                            {truncateBody(template.body)}
                          </p>
                        </div>
                        <MessageTemplateRowActions template={template} />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Updated {formatDate(template.updated_at)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-5">Name</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-12 pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} className="group">
                      <TableCell className="pl-5 font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-md truncate text-sm">
                        {truncateBody(template.body)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(template.updated_at)}
                      </TableCell>
                      <TableCell className="pr-5">
                        <MessageTemplateRowActions template={template} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        Templates appear in the compose area on{' '}
        <Link
          href="/messages"
          className="text-foreground underline underline-offset-2"
        >
          Inbox
        </Link>{' '}
        and client profile Messages tabs.
      </p>
    </div>
  )
}
