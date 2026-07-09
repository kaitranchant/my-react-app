'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { updateClientOnboardingAssessmentNotes } from '@/app/(dashboard)/clients/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMobileKeyboardOptional } from '@/components/mobile-keyboard/mobile-keyboard-context'

type ClientAssessmentNotesPanelProps = {
  clientId: string
  clientName: string
  initialNotes: string | null
  onCancel?: () => void
}

export function ClientAssessmentNotesPanel({
  clientId,
  clientName,
  initialNotes,
  onCancel,
}: ClientAssessmentNotesPanelProps) {
  const router = useRouter()
  const keyboard = useMobileKeyboardOptional()
  const [notes, setNotes] = React.useState(initialNotes ?? '')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const savedNotes = initialNotes ?? ''
  const isDirty = notes !== savedNotes

  React.useEffect(() => {
    setNotes(initialNotes ?? '')
  }, [initialNotes])

  function handleCancel() {
    setNotes(savedNotes)
    keyboard?.closeKeyboard()
    onCancel?.()
  }

  async function handleSave() {
    setIsSubmitting(true)
    const result = await updateClientOnboardingAssessmentNotes(clientId, notes)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Assessment notes saved')
      keyboard?.closeKeyboard()
      router.refresh()
      onCancel?.()
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
          onClick={handleCancel}
          disabled={isSubmitting}
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
