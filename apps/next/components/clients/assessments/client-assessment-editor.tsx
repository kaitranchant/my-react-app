'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'

import { fetchAssessmentTemplates } from '@/app/(dashboard)/library/assessment-templates/actions'
import {
  deleteAssessmentMedia,
  fetchAssessmentCatalog,
  saveClientAssessment,
} from '@/app/(dashboard)/clients/assessment-actions'
import { AssessmentItemPicker } from '@/components/clients/assessments/assessment-item-picker'
import {
  AssessmentResultFields,
  type EditableAssessmentResult,
} from '@/components/clients/assessments/assessment-result-fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  ASSESSMENT_CATEGORY_LABELS,
  formatAssessmentScore,
  isAssessmentResultScored,
  parseAssessmentRubricConfig,
  parseAssessmentScoreData,
} from '@/lib/assessments'
import { cn } from '@/lib/utils'
import type {
  AssessmentItem,
  AssessmentTemplateWithItems,
  ClientAssessmentWithResults,
  Json,
} from 'app/types/database'
import type { SaveClientAssessmentValues } from '@/lib/validations/assessment'

export type DeferredAssessmentDraft = Omit<SaveClientAssessmentValues, 'clientId'>

type EditorPhase = 'select' | 'run'

type ClientAssessmentEditorProps = {
  clientId: string
  clientName: string
  source?: 'manual' | 'onboarding'
  initialAssessment?: ClientAssessmentWithResults | null
  initialDraft?: DeferredAssessmentDraft | null
  onCancel?: () => void
  onSaved?: (assessmentId: string, draft: DeferredAssessmentDraft) => void
  onDeferredSave?: (draft: DeferredAssessmentDraft) => void
  compact?: boolean
}

function toEditableResult(
  assessment: ClientAssessmentWithResults
): EditableAssessmentResult[] {
  return assessment.results.map((result, index) => ({
    clientKey: result.id,
    assessmentItemId: result.assessment_item_id,
    itemName: result.item_name,
    itemCategory: result.item_category,
    rubricType: result.rubric_type,
    rubricConfig: result.rubric_config,
    scaleScore: result.scale_score,
    passFail: result.pass_fail,
    measurementValue: result.measurement_value,
    measurementUnit: result.measurement_unit,
    scoreData: parseAssessmentScoreData(result.score_data),
    notes: result.notes ?? '',
    sortOrder: result.sort_order ?? index,
    existingMedia: result.media ?? [],
    stagedMedia: [],
    removedMediaIds: [],
  }))
}

function draftToEditableResults(
  draft: DeferredAssessmentDraft
): EditableAssessmentResult[] {
  return draft.results.map((result, index) => ({
    clientKey: result.clientKey,
    assessmentItemId: result.assessmentItemId ?? null,
    itemName: result.itemName,
    itemCategory: result.itemCategory,
    rubricType: result.rubricType,
    rubricConfig: (result.rubricConfig ?? {}) as EditableAssessmentResult['rubricConfig'],
    scaleScore: result.scaleScore ?? null,
    passFail: result.passFail ?? null,
    measurementValue: result.measurementValue ?? null,
    measurementUnit: result.measurementUnit ?? null,
    scoreData: parseAssessmentScoreData(
      (result.scoreData ?? {}) as Json
    ),
    notes: result.notes ?? '',
    sortOrder: result.sortOrder ?? index,
    existingMedia: [],
    stagedMedia: [],
    removedMediaIds: [],
  }))
}

function assessedAtToLocalInput(value?: string | null): string {
  const date = value ? new Date(value) : new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

function itemToEditable(item: AssessmentItem, sortOrder: number): EditableAssessmentResult {
  const config = parseAssessmentRubricConfig(item.rubric_type, item.rubric_config)
  return {
    clientKey: crypto.randomUUID(),
    assessmentItemId: item.id,
    itemName: item.name,
    itemCategory: item.category,
    rubricType: item.rubric_type,
    rubricConfig: item.rubric_config,
    scaleScore: null,
    passFail: null,
    measurementValue: null,
    measurementUnit: config.unit ?? null,
    scoreData: {},
    notes: '',
    sortOrder,
    existingMedia: [],
    stagedMedia: [],
    removedMediaIds: [],
  }
}

function isResultCompleted(result: EditableAssessmentResult): boolean {
  return isAssessmentResultScored({
    rubricType: result.rubricType,
    rubricConfig: result.rubricConfig,
    scaleScore: result.scaleScore,
    passFail: result.passFail,
    measurementValue: result.measurementValue,
    scoreData: result.scoreData,
    notes: result.notes,
    hasMedia:
      result.existingMedia.length > 0 || result.stagedMedia.length > 0,
  })
}

function resultStatusLabel(result: EditableAssessmentResult): string {
  if (!isResultCompleted(result)) return 'Not started'
  if (result.rubricType === 'notes') {
    return result.notes.trim() ? 'Notes added' : 'Media added'
  }
  return formatAssessmentScore({
    rubric_type: result.rubricType,
    rubric_config: result.rubricConfig,
    scale_score: result.scaleScore,
    pass_fail: result.passFail,
    measurement_value: result.measurementValue,
    measurement_unit: result.measurementUnit,
    score_data: result.scoreData as Json,
  })
}

async function uploadStagedMedia(input: {
  clientId: string
  assessmentId: string
  resultId: string
  file: File
}): Promise<{ success: true } | { success: false; error: string; fileName: string }> {
  const formData = new FormData()
  formData.set('file', input.file)
  formData.set('clientId', input.clientId)
  formData.set('assessmentId', input.assessmentId)
  formData.set('resultId', input.resultId)

  try {
    const response = await fetch('/api/client-assessments/media', {
      method: 'POST',
      body: formData,
    })
    const payload = (await response.json()) as
      | { success: true }
      | { success: false; error: string }
    if (!payload.success) {
      return {
        success: false,
        error: payload.error,
        fileName: input.file.name,
      }
    }
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Upload failed.',
      fileName: input.file.name,
    }
  }
}

export function ClientAssessmentEditor({
  clientId,
  clientName,
  source = 'manual',
  initialAssessment = null,
  initialDraft = null,
  onCancel,
  onSaved,
  onDeferredSave,
  compact = false,
}: ClientAssessmentEditorProps) {
  const seededResults = React.useMemo(() => {
    if (initialAssessment?.results.length) {
      return toEditableResult(initialAssessment)
    }
    if (initialDraft?.results.length) {
      return draftToEditableResults(initialDraft)
    }
    return []
  }, [initialAssessment, initialDraft])

  const [catalog, setCatalog] = React.useState<AssessmentItem[]>([])
  const [templates, setTemplates] = React.useState<
    AssessmentTemplateWithItems[]
  >([])
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('')
  const [loadingCatalog, setLoadingCatalog] = React.useState(true)
  const [pending, setPending] = React.useState(false)
  const [persistedAssessmentId, setPersistedAssessmentId] = React.useState<
    string | null
  >(initialAssessment?.id ?? initialDraft?.assessmentId ?? null)
  const [phase, setPhase] = React.useState<EditorPhase>(
    seededResults.length > 0 ? 'run' : 'select'
  )
  const [activeResultKey, setActiveResultKey] = React.useState<string | null>(null)
  const [draftResult, setDraftResult] = React.useState<EditableAssessmentResult | null>(
    null
  )
  const [title, setTitle] = React.useState(
    initialAssessment?.title ??
      initialDraft?.title ??
      (source === 'onboarding' ? 'Initial assessment' : 'Assessment')
  )
  const [assessedAtLocal, setAssessedAtLocal] = React.useState(() =>
    assessedAtToLocalInput(
      initialAssessment?.assessed_at ?? initialDraft?.assessedAt ?? null
    )
  )
  const [overallNotes, setOverallNotes] = React.useState(
    initialAssessment?.overall_notes ?? initialDraft?.overallNotes ?? ''
  )
  const [results, setResults] =
    React.useState<EditableAssessmentResult[]>(seededResults)

  React.useEffect(() => {
    let cancelled = false
    setLoadingCatalog(true)
    Promise.all([fetchAssessmentCatalog(), fetchAssessmentTemplates()])
      .then(([items, templateRows]) => {
        if (!cancelled) {
          setCatalog(items)
          setTemplates(templateRows)
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const selectedItemIds = React.useMemo(
    () =>
      new Set(
        results
          .map((result) => result.assessmentItemId)
          .filter((id): id is string => Boolean(id))
      ),
    [results]
  )

  const completedCount = results.filter(isResultCompleted).length

  function handleToggleItem(item: AssessmentItem) {
    setResults((current) => {
      const existingIndex = current.findIndex(
        (result) => result.assessmentItemId === item.id
      )
      if (existingIndex >= 0) {
        const next = [...current]
        const [removed] = next.splice(existingIndex, 1)
        for (const media of removed.stagedMedia) {
          URL.revokeObjectURL(media.previewUrl)
        }
        return next.map((result, index) => ({ ...result, sortOrder: index }))
      }
      return [...current, itemToEditable(item, current.length)]
    })
  }

  function handleItemCreated(item: AssessmentItem) {
    setCatalog((current) => {
      if (current.some((row) => row.id === item.id)) return current
      return [...current, item]
    })
  }

  function handleNextFromSelect() {
    if (results.length === 0) {
      toast.error('Select at least one test to continue.')
      return
    }
    setPhase('run')
  }

  function applySelectedTemplate() {
    const template = templates.find((row) => row.id === selectedTemplateId)
    if (!template) return
    if (completedCount > 0) {
      toast.error(
        'Clear or finish this assessment before replacing scored tests with a template.'
      )
      return
    }

    const catalogById = new Map(catalog.map((item) => [item.id, item]))
    const templateItems = [...template.items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => catalogById.get(row.assessment_item_id))
      .filter((item): item is AssessmentItem => Boolean(item))

    if (templateItems.length === 0) {
      toast.error('This template has no available tests.')
      return
    }

    setResults(
      templateItems.map((item, index) => itemToEditable(item, index))
    )
    if (title === 'Assessment' || title === 'Initial assessment') {
      setTitle(template.name)
    }
    const unavailableCount = template.items.length - templateItems.length
    toast.success(
      unavailableCount > 0
        ? `Template applied. ${unavailableCount} unavailable test${unavailableCount === 1 ? '' : 's'} skipped.`
        : `${template.name} applied`
    )
  }

  function openBeginDialog(result: EditableAssessmentResult) {
    setActiveResultKey(result.clientKey)
    setDraftResult({
      ...result,
      stagedMedia: [...result.stagedMedia],
      removedMediaIds: [...result.removedMediaIds],
      existingMedia: [...result.existingMedia],
    })
  }

  function closeBeginDialog() {
    setActiveResultKey(null)
    setDraftResult(null)
  }

  function saveBeginDialog() {
    if (!draftResult || !activeResultKey) return

    if (
      !isAssessmentResultScored({
        rubricType: draftResult.rubricType,
        rubricConfig: draftResult.rubricConfig,
        scaleScore: draftResult.scaleScore,
        passFail: draftResult.passFail,
        measurementValue: draftResult.measurementValue,
        scoreData: draftResult.scoreData,
        notes: draftResult.notes,
        hasMedia:
          draftResult.existingMedia.length > 0 ||
          draftResult.stagedMedia.length > 0,
      })
    ) {
      toast.error('Complete the scoring fields before saving.')
      return
    }

    setResults((current) =>
      current.map((row) =>
        row.clientKey === activeResultKey ? { ...draftResult } : row
      )
    )
    closeBeginDialog()
  }

  async function handleSaveAssessment() {
    if (results.length === 0 && !overallNotes.trim()) {
      toast.error('Select at least one test or add overall notes.')
      return
    }

    const incomplete = results.find((result) => !isResultCompleted(result))
    if (incomplete) {
      toast.error(`Finish ${incomplete.itemName} before saving the assessment.`)
      return
    }

    const assessedAt = new Date(assessedAtLocal).toISOString()
    const draft: DeferredAssessmentDraft = {
      assessmentId: persistedAssessmentId,
      title: title.trim() || null,
      assessedAt,
      overallNotes: overallNotes.trim() || null,
      source,
      results: results.map((result, index) => ({
        clientKey: result.clientKey,
        assessmentItemId: result.assessmentItemId,
        itemName: result.itemName,
        itemCategory: result.itemCategory,
        rubricType: result.rubricType,
        rubricConfig:
          typeof result.rubricConfig === 'object' &&
          result.rubricConfig &&
          !Array.isArray(result.rubricConfig)
            ? (result.rubricConfig as Record<string, unknown>)
            : {},
        scaleScore: result.scaleScore,
        passFail: result.passFail,
        measurementValue: result.measurementValue,
        measurementUnit: result.measurementUnit,
        scoreData: result.scoreData ?? {},
        notes: result.notes.trim() || null,
        sortOrder: index,
      })),
    }

    if (!clientId) {
      onDeferredSave?.(draft)
      return
    }

    setPending(true)

    const saveResult = await saveClientAssessment({
      clientId,
      ...draft,
    })

    if (!saveResult.success) {
      setPending(false)
      toast.error(saveResult.error)
      return
    }

    const { assessmentId, resultIdsByClientKey } = saveResult.data
    setPersistedAssessmentId(assessmentId)
    const mediaFailures: string[] = []

    for (const result of results) {
      for (const mediaId of result.removedMediaIds) {
        const deleted = await deleteAssessmentMedia(mediaId)
        if (!deleted.success) {
          mediaFailures.push(`Could not remove a file from ${result.itemName}`)
        }
      }

      const persistedResultId = resultIdsByClientKey[result.clientKey]
      if (!persistedResultId) continue

      for (const staged of result.stagedMedia) {
        const uploaded = await uploadStagedMedia({
          clientId,
          assessmentId,
          resultId: persistedResultId,
          file: staged.file,
        })
        if (!uploaded.success) {
          mediaFailures.push(`${uploaded.fileName}: ${uploaded.error}`)
        }
      }
    }

    setPending(false)

    const remappedResults = results.map((result) => {
      const persistedResultId =
        resultIdsByClientKey[result.clientKey] ?? result.clientKey
      for (const media of result.stagedMedia) {
        URL.revokeObjectURL(media.previewUrl)
      }
      return {
        ...result,
        clientKey: persistedResultId,
        stagedMedia: [],
        removedMediaIds: [],
      }
    })
    setResults(remappedResults)

    if (mediaFailures.length > 0) {
      toast.warning(
        `Assessment saved, but ${mediaFailures.length} media upload(s) failed. You can edit and retry.`
      )
    } else {
      toast.success('Assessment saved')
    }

    onSaved?.(assessmentId, {
      ...draft,
      assessmentId,
      results: remappedResults.map((result, index) => ({
        clientKey: result.clientKey,
        assessmentItemId: result.assessmentItemId,
        itemName: result.itemName,
        itemCategory: result.itemCategory,
        rubricType: result.rubricType,
        rubricConfig:
          typeof result.rubricConfig === 'object' &&
          result.rubricConfig &&
          !Array.isArray(result.rubricConfig)
            ? (result.rubricConfig as Record<string, unknown>)
            : {},
        scaleScore: result.scaleScore,
        passFail: result.passFail,
        measurementValue: result.measurementValue,
        measurementUnit: result.measurementUnit,
        scoreData: result.scoreData ?? {},
        notes: result.notes.trim() || null,
        sortOrder: index,
      })),
    })
  }

  return (
    <div className="grid gap-4">
      {!compact ? (
        <p className="text-muted-foreground text-sm">
          Select tests for {clientName}, then begin each one to score and add notes.
        </p>
      ) : null}

      {phase === 'select' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="assessment-title">Title</Label>
              <Input
                id="assessment-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assessment-date">Date</Label>
              <Input
                id="assessment-date"
                type="datetime-local"
                value={assessedAtLocal}
                onChange={(event) => setAssessedAtLocal(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label>Assessment template</Label>
                <p className="text-muted-foreground text-xs">
                  Load a reusable list of tests.
                </p>
              </div>
              <Button variant="link" size="sm" asChild className="h-auto p-0">
                <Link href="/library/assessment-templates">
                  Manage templates
                </Link>
              </Button>
            </div>
            {templates.length > 0 ? (
              <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                  disabled={pending}
                >
                  <SelectTrigger className="min-w-0">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.items.length} tests)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="whitespace-nowrap"
                  disabled={!selectedTemplateId || pending || completedCount > 0}
                  onClick={applySelectedTemplate}
                >
                  Apply template
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No templates yet. Create one in the assessment template library.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Select tests</Label>
              <p className="text-muted-foreground text-xs">
                {results.length} selected
              </p>
            </div>
            {loadingCatalog ? (
              <p className="text-muted-foreground text-sm">
                Loading assessment library…
              </p>
            ) : (
              <AssessmentItemPicker
                items={catalog}
                selectedItemIds={selectedItemIds}
                onToggleItem={handleToggleItem}
                onItemCreated={handleItemCreated}
                disabled={pending}
              />
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={pending}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={handleNextFromSelect}
              disabled={pending || results.length === 0}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => setPhase('select')}
              disabled={pending}
            >
              <ChevronLeft className="size-4" />
              Change tests
            </Button>
            <p className="text-muted-foreground text-xs">
              {completedCount} of {results.length} complete
            </p>
          </div>

          <div className="grid gap-2">
            {results.map((result) => {
              const done = isResultCompleted(result)
              return (
                <div
                  key={result.clientKey}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3 py-3',
                    done && 'border-brand/20 bg-brand/5'
                  )}
                >
                  <div
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      done
                        ? 'bg-brand text-brand-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {done ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <span className="text-xs font-semibold">
                        {result.sortOrder + 1}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{result.itemName}</p>
                    <p className="text-muted-foreground text-xs">
                      {ASSESSMENT_CATEGORY_LABELS[result.itemCategory]}
                      {' · '}
                      {resultStatusLabel(result)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={done ? 'outline' : 'brand'}
                    size="sm"
                    disabled={pending}
                    onClick={() => openBeginDialog(result)}
                  >
                    {done ? 'Edit' : 'Begin'}
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assessment-overall-notes">Overall notes</Label>
            <Textarea
              id="assessment-overall-notes"
              rows={compact ? 3 : 4}
              value={overallNotes}
              onChange={(event) => setOverallNotes(event.target.value)}
              placeholder="Summary observations from the session…"
              disabled={pending}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={pending}
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={() => void handleSaveAssessment()}
              disabled={pending || results.length === 0}
            >
              {pending
                ? 'Saving…'
                : initialAssessment
                  ? 'Save changes'
                  : 'Save assessment'}
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={Boolean(activeResultKey && draftResult)}
        onOpenChange={(open) => {
          if (!open) closeBeginDialog()
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draftResult?.itemName ?? 'Assessment test'}</DialogTitle>
            <DialogDescription>
              Score this test, add notes, and attach photos or video.
            </DialogDescription>
          </DialogHeader>
          {draftResult ? (
            <AssessmentResultFields
              result={draftResult}
              bare
              disabled={pending}
              onChange={setDraftResult}
            />
          ) : null}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={closeBeginDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={saveBeginDialog}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
