'use client'

import * as React from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { applyMessageTemplateVariables } from '@/lib/message-templates'
import type { CoachMessageTemplate } from 'app/types/database'

type MessageTemplatePickerProps = {
  templates: CoachMessageTemplate[]
  clientName: string
  onInsert: (body: string) => void
}

export function MessageTemplatePicker({
  templates,
  clientName,
  onInsert,
}: MessageTemplatePickerProps) {
  const [selectedId, setSelectedId] = React.useState<string>('')

  function handleSelect(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    if (!template) return

    onInsert(
      applyMessageTemplateVariables(template.body, {
        clientName,
      })
    )
    setSelectedId('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t px-5 py-2">
      <FileText className="text-muted-foreground size-3.5 shrink-0" />
      {templates.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          No templates yet.{' '}
          <Link
            href="/library/message-templates"
            className="text-foreground font-medium underline underline-offset-2"
          >
            Create one
          </Link>
        </p>
      ) : (
        <>
          <Select value={selectedId || undefined} onValueChange={handleSelect}>
            <SelectTrigger className="h-8 w-auto min-w-44 max-w-full text-xs">
              <SelectValue placeholder="Insert template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link
            href="/library/message-templates"
            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
          >
            Manage
          </Link>
        </>
      )}
    </div>
  )
}
