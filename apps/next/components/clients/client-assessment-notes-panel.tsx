'use client'

import { ClientAssessmentHistory } from '@/components/clients/assessments/client-assessment-history'
import type { ClientAssessmentWithResults } from 'app/types/database'

type ClientAssessmentNotesPanelProps = {
  clientId: string
  clientName: string
  /** @deprecated Kept for call-site compatibility; structured history loads from the database. */
  initialNotes?: string | null
  initialAssessments?: ClientAssessmentWithResults[]
  onCancel?: () => void
  autoStartNew?: boolean
}

export function ClientAssessmentNotesPanel({
  clientId,
  clientName,
  initialAssessments,
  onCancel,
  autoStartNew,
}: ClientAssessmentNotesPanelProps) {
  return (
    <ClientAssessmentHistory
      clientId={clientId}
      clientName={clientName}
      initialAssessments={initialAssessments}
      onClose={onCancel}
      autoStartNew={autoStartNew}
    />
  )
}
