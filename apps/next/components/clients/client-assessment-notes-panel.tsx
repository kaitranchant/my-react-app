'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateClientOnboardingAssessmentNotes } from '@/app/(dashboard)/clients/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

type ClientAssessmentNotesPanelProps = {
  clientId: string
  clientName: string
  initialNotes: string | null
}

export function ClientAssessmentNotesPanel({
  clientId,
  clientName,
  initialNotes,
}: ClientAssessmentNotesPanelProps) {
  const router = useRouter()
  const [notes, setNotes] = React.useState(initialNotes ?? '')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const savedNotes = initialNotes ?? ''
  const isDirty = notes !== savedNotes

  React.useEffect(() => {
    setNotes(initialNotes ?? '')
  }, [initialNotes])

  async function handleSave() {
    setIsSubmitting(true)
    const result = await updateClientOnboardingAssessmentNotes(clientId, notes)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Assessment notes saved')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Notes from {clientName}&apos;s initial assessment and onboarding session.
      </p>
      <Textarea
        rows={8}
        className="min-h-[10rem] resize-y"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Movement screen results, injuries, goals discussed…"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setNotes(savedNotes)}
          disabled={!isDirty || isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isDirty || isSubmitting}
        >
          {isSubmitting ? 'Saving…' : 'Save notes'}
        </Button>
      </div>
    </div>
  )
}
