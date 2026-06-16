'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateClientNotes } from '@/app/(dashboard)/clients/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

type ClientNotesEditorProps = {
  clientId: string
  initialNotes: string | null
}

export function ClientNotesEditor({
  clientId,
  initialNotes,
}: ClientNotesEditorProps) {
  const router = useRouter()
  const [notes, setNotes] = React.useState(initialNotes ?? '')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const savedNotes = initialNotes ?? ''
  const isDirty = notes !== savedNotes

  React.useEffect(() => {
    setNotes(initialNotes ?? '')
  }, [initialNotes])

  function handleCancel() {
    setNotes(savedNotes)
  }

  async function handleSave() {
    setIsSubmitting(true)
    const result = await updateClientNotes(clientId, notes)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Notes saved')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Textarea
          rows={8}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Injuries, preferences, context…"
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={!isDirty || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Save notes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
