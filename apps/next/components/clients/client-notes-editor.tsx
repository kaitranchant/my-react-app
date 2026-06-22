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
    <Card className="gap-0 py-0 md:gap-6 md:py-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 pb-0 md:px-6 md:pt-6">
        <CardTitle className="text-base md:text-lg">Coach notes</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 px-4 pb-4 md:gap-4 md:px-6 md:pb-6">
        <Textarea
          rows={3}
          className="min-h-[5.5rem] resize-none md:min-h-[12rem] md:resize-y"
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
