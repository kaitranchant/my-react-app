'use client'

import * as React from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

import {
  deleteClientAssessment,
  fetchClientAssessments,
} from '@/app/(dashboard)/clients/assessment-actions'
import { ClientAssessmentEditor } from '@/components/clients/assessments/client-assessment-editor'
import { Button } from '@/components/ui/button'
import {
  ASSESSMENT_CATEGORY_LABELS,
  formatAssessmentDate,
  formatAssessmentDelta,
  formatAssessmentScore,
  getAssessmentScoreDetails,
  isAssessmentMediaImage,
  parseAssessmentRubricConfig,
} from '@/lib/assessments'
import { cn } from '@/lib/utils'
import type { ClientAssessmentWithResults } from 'app/types/database'

type ClientAssessmentHistoryProps = {
  clientId: string
  clientName: string
  initialAssessments?: ClientAssessmentWithResults[]
  onClose?: () => void
  autoStartNew?: boolean
}

export function ClientAssessmentHistory({
  clientId,
  clientName,
  initialAssessments,
  onClose,
  autoStartNew = false,
}: ClientAssessmentHistoryProps) {
  const router = useRouter()
  const [assessments, setAssessments] = React.useState<
    ClientAssessmentWithResults[]
  >(initialAssessments ?? [])
  const [loading, setLoading] = React.useState(!initialAssessments)
  const [mode, setMode] = React.useState<'list' | 'create' | 'edit'>(
    autoStartNew ? 'create' : 'list'
  )
  const [editing, setEditing] =
    React.useState<ClientAssessmentWithResults | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    setLoading(true)
    const rows = await fetchClientAssessments(clientId)
    setAssessments(rows)
    setLoading(false)
  }, [clientId])

  React.useEffect(() => {
    if (!initialAssessments) {
      void reload()
    }
  }, [initialAssessments, reload])

  async function handleDelete(assessmentId: string) {
    setDeletingId(assessmentId)
    const result = await deleteClientAssessment(assessmentId)
    setDeletingId(null)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Assessment deleted')
    await reload()
    router.refresh()
  }

  async function handleSaved() {
    setMode('list')
    setEditing(null)
    await reload()
    router.refresh()
  }

  if (mode === 'create') {
    return (
      <ClientAssessmentEditor
        clientId={clientId}
        clientName={clientName}
        source="manual"
        onCancel={() => {
          setMode('list')
          onClose?.()
        }}
        onSaved={() => void handleSaved()}
      />
    )
  }

  if (mode === 'edit' && editing) {
    return (
      <ClientAssessmentEditor
        clientId={clientId}
        clientName={clientName}
        source={editing.source === 'onboarding' ? 'onboarding' : 'manual'}
        initialAssessment={editing}
        onCancel={() => {
          setMode('list')
          setEditing(null)
        }}
        onSaved={() => void handleSaved()}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Dated assessment history for {clientName}. Re-test to show progress.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => setMode('create')}
        >
          <Plus className="size-4" />
          New assessment
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading assessments…</p>
      ) : assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="text-sm font-medium">No assessments yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Record an initial movement screen, strength tests, or intake notes.
          </p>
          <Button
            type="button"
            className="mt-4"
            onClick={() => setMode('create')}
          >
            Start assessment
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {assessments.map((assessment) => (
            <article
              key={assessment.id}
              className="grid gap-3 rounded-xl border p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">
                    {assessment.title?.trim() || 'Assessment'}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {formatAssessmentDate(assessment.assessed_at)}
                    {assessment.source === 'legacy_import'
                      ? ' · Imported notes'
                      : assessment.source === 'onboarding'
                        ? ' · Onboarding'
                        : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  {assessment.source !== 'legacy_import' ||
                  assessment.results.length > 0 ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Edit assessment"
                      onClick={() => {
                        setEditing(assessment)
                        setMode('edit')
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete assessment"
                    disabled={deletingId === assessment.id}
                    onClick={() => void handleDelete(assessment.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {assessment.overall_notes ? (
                <p className="text-sm whitespace-pre-wrap">
                  {assessment.overall_notes}
                </p>
              ) : null}

              {assessment.results.length > 0 ? (
                <ul className="grid gap-2">
                  {assessment.results.map((result) => {
                    const config = parseAssessmentRubricConfig(
                      result.rubric_type,
                      result.rubric_config
                    )
                    const deltaInfo = formatAssessmentDelta(
                      result.delta,
                      result.rubric_type,
                      config.higherIsBetter
                    )
                    return (
                      <li
                        key={result.id}
                        className="rounded-lg bg-muted/40 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {result.item_name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {ASSESSMENT_CATEGORY_LABELS[result.item_category]}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {formatAssessmentScore(result)}
                            </p>
                            {deltaInfo ? (
                              <p
                                className={cn(
                                  'inline-flex items-center gap-0.5 text-xs',
                                  deltaInfo.direction === 'up' &&
                                    'text-emerald-600 dark:text-emerald-400',
                                  deltaInfo.direction === 'down' &&
                                    'text-rose-600 dark:text-rose-400',
                                  (deltaInfo.direction === 'flat' ||
                                    deltaInfo.direction === 'neutral') &&
                                    'text-muted-foreground'
                                )}
                              >
                                {deltaInfo.direction === 'up' ? (
                                  <ArrowUpRight className="size-3" />
                                ) : deltaInfo.direction === 'down' ? (
                                  <ArrowDownRight className="size-3" />
                                ) : (
                                  <Minus className="size-3" />
                                )}
                                {deltaInfo.label}
                                {result.previousScoreLabel
                                  ? ` from ${result.previousScoreLabel}`
                                  : ''}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {(() => {
                          const details = getAssessmentScoreDetails(result)
                          if (details.length === 0) return null
                          return (
                            <ul className="mt-2 grid gap-1.5 border-t border-border/60 pt-2">
                              {details.map((detail) => (
                                <li
                                  key={`${detail.label}-${detail.value}`}
                                  className="grid gap-0.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3"
                                >
                                  <p className="text-muted-foreground text-xs leading-snug">
                                    {detail.label}
                                  </p>
                                  <p
                                    className={cn(
                                      'text-xs font-medium sm:text-right',
                                      detail.tone === 'alert' &&
                                        'text-amber-700 dark:text-amber-300',
                                      detail.tone === 'muted' &&
                                        'text-muted-foreground',
                                      (!detail.tone ||
                                        detail.tone === 'default') &&
                                        'text-foreground'
                                    )}
                                  >
                                    {detail.value}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )
                        })()}
                        {result.notes ? (
                          <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                            {result.notes}
                          </p>
                        ) : null}
                        {result.media.length > 0 ? (
                          <div className="mt-2 grid grid-cols-3 gap-1.5">
                            {result.media.map((media) =>
                              isAssessmentMediaImage(media.content_type) &&
                              media.signedUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  key={media.id}
                                  src={media.signedUrl}
                                  alt={media.file_name ?? result.item_name}
                                  className="h-16 w-full rounded-md object-cover"
                                />
                              ) : media.signedUrl ? (
                                <video
                                  key={media.id}
                                  src={media.signedUrl}
                                  className="h-16 w-full rounded-md object-cover"
                                  controls
                                />
                              ) : (
                                <div
                                  key={media.id}
                                  className="bg-muted text-muted-foreground flex h-16 items-center justify-center rounded-md text-[10px]"
                                >
                                  Media unavailable
                                </div>
                              )
                            )}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      )}

      {onClose ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : null}
    </div>
  )
}
