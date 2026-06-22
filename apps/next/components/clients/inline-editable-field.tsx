'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { updateClientProfileField } from '@/app/(dashboard)/clients/actions'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type InlineEditableFieldProps = {
  clientId: string
  field: 'goal' | 'phone'
  value: string
  placeholder?: string
  emphasize?: boolean
  emptyLabel?: string
}

export function InlineEditableField({
  clientId,
  field,
  value,
  placeholder,
  emphasize,
  emptyLabel = '—',
}: InlineEditableFieldProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const [isSaving, setIsSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(value)
    }
  }, [isEditing, value])

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  async function save(nextValue: string) {
    const trimmed = nextValue.trim()
    const savedValue = value.trim()

    if (trimmed === savedValue) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    const result = await updateClientProfileField(clientId, field, trimmed)
    setIsSaving(false)

    if (result.success) {
      toast.success('Saved')
      setIsEditing(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void save(draft)
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(value)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void save(draft)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSaving}
        className="h-8 max-w-[16rem] text-right text-sm"
      />
    )
  }

  const displayValue = value.trim() || emptyLabel
  const isEmpty = displayValue === emptyLabel

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        'group inline-flex max-w-[16rem] items-center justify-end gap-1.5 text-right text-sm transition-colors',
        'hover:text-brand focus-visible:text-brand focus-visible:outline-none',
        emphasize && !isEmpty && 'font-medium',
        isEmpty && 'text-muted-foreground'
      )}
    >
      <span className="truncate">{displayValue}</span>
      <Pencil className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  )
}
