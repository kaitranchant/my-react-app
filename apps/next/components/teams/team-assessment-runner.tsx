'use client'

import * as React from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteAssessmentMedia,
  fetchAssessmentCatalog,
} from '@/app/(dashboard)/clients/assessment-actions'
import { fetchAssessmentTemplates } from '@/app/(dashboard)/library/assessment-templates/actions'
import {
  completeTeamAssessmentSession,
  createTeamAssessmentSession,
  fetchTeamAssessmentSessionDetail,
  saveTeamAssessmentResult,
  type TeamAssessmentSessionDetail,
  type TeamAssessmentSessionMember,
} from '@/app/(dashboard)/teams/assessment-actions'
import { AssessmentItemPicker } from '@/components/clients/assessments/assessment-item-picker'
import {
  AssessmentResultFields,
  type EditableAssessmentResult,
} from '@/components/clients/assessments/assessment-result-fields'
import { Badge } from '@/components/ui/badge'
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
import { PersonRow } from '@/components/ui/person-row'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ASSESSMENT_CATEGORY_LABELS,
  formatAssessmentDate,
  formatAssessmentScore,
  isAssessmentResultScored,
  parseAssessmentRubricConfig,
  parseAssessmentScoreData,
} from '@/lib/assessments'
import { cn } from '@/lib/utils'
import type {
  AssessmentItem,
  AssessmentTemplateWithItems,
  ClientAssessmentResultWithMedia,
  TeamAssessmentSessionItem,
} from 'app/types/database'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function resultMatchesItem(
  result: Pick<ClientAssessmentResultWithMedia, 'assessment_item_id' | 'item_name'>,
  item: Pick<TeamAssessmentSessionItem, 'assessment_item_id' | 'item_name'>
): boolean {
  if (item.assessment_item_id && result.assessment_item_id) {
    return result.assessment_item_id === item.assessment_item_id
  }
  return result.item_name === item.item_name
}

function buildEditableResult(
  item: TeamAssessmentSessionItem,
  existing: ClientAssessmentResultWithMedia | null
): EditableAssessmentResult {
  if (existing) {
    return {
      clientKey: existing.id,
      assessmentItemId: existing.assessment_item_id,
      itemName: existing.item_name,
      itemCategory: existing.item_category,
      rubricType: existing.rubric_type,
      rubricConfig: existing.rubric_config,
      scaleScore: existing.scale_score,
      passFail: existing.pass_fail,
      measurementValue: existing.measurement_value,
      measurementUnit: existing.measurement_unit,
      scoreData: parseAssessmentScoreData(existing.score_data),
      notes: existing.notes ?? '',
      sortOrder: existing.sort_order,
      existingMedia: existing.media ?? [],
      stagedMedia: [],
      removedMediaIds: [],
    }
  }

  const config = parseAssessmentRubricConfig(item.rubric_type, item.rubric_config)
  return {
    clientKey: crypto.randomUUID(),
    assessmentItemId: item.assessment_item_id,
    itemName: item.item_name,
    itemCategory: item.item_category,
    rubricType: item.rubric_type,
    rubricConfig: item.rubric_config,
    scaleScore: null,
    passFail: null,
    measurementValue: null,
    measurementUnit: config.unit ?? null,
    scoreData: {},
    notes: '',
    sortOrder: item.sort_order,
    existingMedia: [],
    stagedMedia: [],
    removedMediaIds: [],
  }
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
      return { success: false, error: payload.error, fileName: input.file.name }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Upload failed.', fileName: input.file.name }
  }
}

function assessedAtToLocalInput(value?: string | null): string {
  const date = value ? new Date(value) : new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

// ---------------------------------------------------------------------------
// Create phase: pick tests once for the whole roster
// ---------------------------------------------------------------------------

type TeamAssessmentCreateProps = {
  teamId: string
  memberCount: number
  onCancel: () => void
  onCreated: (sessionId: string) => void
}

export function TeamAssessmentCreate({
  teamId,
  memberCount,
  onCancel,
  onCreated,
}: TeamAssessmentCreateProps) {
  const [catalog, setCatalog] = React.useState<AssessmentItem[]>([])
  const [templates, setTemplates] = React.useState<AssessmentTemplateWithItems[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('')
  const [loadingCatalog, setLoadingCatalog] = React.useState(true)
  const [pending, setPending] = React.useState(false)
  const [title, setTitle] = React.useState('Team assessment')
  const [assessedAtLocal, setAssessedAtLocal] = React.useState(() =>
    assessedAtToLocalInput()
  )
  const [selectedItems, setSelectedItems] = React.useState<AssessmentItem[]>([])

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
    () => new Set(selectedItems.map((item) => item.id)),
    [selectedItems]
  )

  function handleToggleItem(item: AssessmentItem) {
    setSelectedItems((current) => {
      const existingIndex = current.findIndex((row) => row.id === item.id)
      if (existingIndex >= 0) {
        const next = [...current]
        next.splice(existingIndex, 1)
        return next
      }
      return [...current, item]
    })
  }

  function handleItemCreated(item: AssessmentItem) {
    setCatalog((current) => {
      if (current.some((row) => row.id === item.id)) return current
      return [...current, item]
    })
  }

  function applySelectedTemplate() {
    const template = templates.find((row) => row.id === selectedTemplateId)
    if (!template) return

    const catalogById = new Map(catalog.map((item) => [item.id, item]))
    const templateItems = [...template.items]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) => catalogById.get(row.assessment_item_id))
      .filter((item): item is AssessmentItem => Boolean(item))

    if (templateItems.length === 0) {
      toast.error('This template has no available tests.')
      return
    }

    setSelectedItems(templateItems)
    if (title === 'Team assessment') {
      setTitle(template.name)
    }
    const unavailableCount = template.items.length - templateItems.length
    toast.success(
      unavailableCount > 0
        ? `Template applied. ${unavailableCount} unavailable test${unavailableCount === 1 ? '' : 's'} skipped.`
        : `${template.name} applied`
    )
  }

  async function handleStartSession() {
    if (selectedItems.length === 0) {
      toast.error('Select at least one test to continue.')
      return
    }

    setPending(true)
    const result = await createTeamAssessmentSession({
      teamId,
      title: title.trim() || null,
      assessedAt: new Date(assessedAtLocal).toISOString(),
      items: selectedItems.map((item, index) => ({
        assessmentItemId: item.id,
        itemName: item.name,
        itemCategory: item.category,
        rubricType: item.rubric_type,
        rubricConfig:
          typeof item.rubric_config === 'object' &&
          item.rubric_config &&
          !Array.isArray(item.rubric_config)
            ? (item.rubric_config as Record<string, unknown>)
            : {},
        sortOrder: index,
      })),
    })
    setPending(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Team assessment started')
    onCreated(result.data.sessionId)
  }

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        Select tests once, then score each athlete as they come up. Scores save
        into every athlete&apos;s assessment history. {memberCount} athlete
        {memberCount === 1 ? '' : 's'} will be included.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="team-assessment-title">Title</Label>
          <Input
            id="team-assessment-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="team-assessment-date">Date</Label>
          <Input
            id="team-assessment-date"
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
            <Link href="/library/assessment-templates">Manage templates</Link>
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
              disabled={!selectedTemplateId || pending}
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
            {selectedItems.length} selected
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => void handleStartSession()}
          disabled={pending || selectedItems.length === 0}
        >
          {pending ? 'Starting…' : 'Start session'}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Run phase: test list → athlete roster → score → next athlete
// ---------------------------------------------------------------------------

type TeamAssessmentRunnerProps = {
  sessionId: string
  onExit: () => void
}

type ActiveTestState = {
  itemId: string
  view: 'roster' | 'score'
  member: TeamAssessmentSessionMember | null
}

export function TeamAssessmentRunner({ sessionId, onExit }: TeamAssessmentRunnerProps) {
  const [detail, setDetail] = React.useState<TeamAssessmentSessionDetail | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [pending, setPending] = React.useState(false)
  const [completing, setCompleting] = React.useState(false)
  const [activeTest, setActiveTest] = React.useState<ActiveTestState | null>(null)
  const [draftResult, setDraftResult] = React.useState<EditableAssessmentResult | null>(
    null
  )

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchTeamAssessmentSessionDetail(sessionId).then((result) => {
      if (cancelled) return
      if (result.success) {
        setDetail(result.data)
        setLoadError(null)
      } else {
        setLoadError(result.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const resultsByKey = React.useMemo(() => {
    const map = new Map<string, ClientAssessmentResultWithMedia>()
    if (!detail) return map
    for (const item of detail.items) {
      for (const member of detail.members) {
        const match = detail.results.find(
          (result) =>
            result.assessment_id === member.assessmentId &&
            resultMatchesItem(result, item)
        )
        if (match) {
          map.set(`${item.id}:${member.clientId}`, match)
        }
      }
    }
    return map
  }, [detail])

  if (loading) {
    return <p className="text-muted-foreground text-sm">Loading session…</p>
  }

  if (loadError || !detail) {
    return (
      <div className="grid gap-3">
        <p className="text-muted-foreground text-sm">
          {loadError ?? 'Could not load this session.'}
        </p>
        <div>
          <Button type="button" variant="outline" onClick={onExit}>
            <ChevronLeft className="size-4" />
            Back to assessments
          </Button>
        </div>
      </div>
    )
  }

  const { session, items, members } = detail
  const totalScores = items.length * members.length
  const scoredCount = resultsByKey.size
  const isCompleted = session.status === 'completed'

  const activeItem = activeTest
    ? items.find((item) => item.id === activeTest.itemId) ?? null
    : null

  function scoredCountForItem(itemId: string): number {
    let count = 0
    for (const member of members) {
      if (resultsByKey.has(`${itemId}:${member.clientId}`)) count += 1
    }
    return count
  }

  function openScoreView(member: TeamAssessmentSessionMember) {
    if (!activeItem) return
    const existing = resultsByKey.get(`${activeItem.id}:${member.clientId}`) ?? null
    setDraftResult(buildEditableResult(activeItem, existing))
    setActiveTest((current) =>
      current ? { ...current, view: 'score', member } : current
    )
  }

  function backToRoster() {
    setDraftResult(null)
    setActiveTest((current) =>
      current ? { ...current, view: 'roster', member: null } : current
    )
  }

  function closeTestDialog() {
    setActiveTest(null)
    setDraftResult(null)
  }

  function nextUnscoredMember(
    afterClientId: string
  ): TeamAssessmentSessionMember | null {
    if (!activeItem) return null
    const startIndex = members.findIndex((member) => member.clientId === afterClientId)
    for (let offset = 1; offset <= members.length; offset += 1) {
      const candidate = members[(startIndex + offset) % members.length]!
      if (candidate.clientId === afterClientId) continue
      if (!resultsByKey.has(`${activeItem.id}:${candidate.clientId}`)) {
        return candidate
      }
    }
    return null
  }

  async function handleSaveScore(advance: boolean) {
    if (!activeItem || !activeTest?.member || !draftResult) return
    const member = activeTest.member

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
          draftResult.existingMedia.length > 0 || draftResult.stagedMedia.length > 0,
      })
    ) {
      toast.error('Complete the scoring fields before saving.')
      return
    }

    setPending(true)

    const saveResult = await saveTeamAssessmentResult({
      sessionId,
      clientId: member.clientId,
      result: {
        clientKey: draftResult.clientKey,
        assessmentItemId: draftResult.assessmentItemId,
        itemName: draftResult.itemName,
        itemCategory: draftResult.itemCategory,
        rubricType: draftResult.rubricType,
        rubricConfig:
          typeof draftResult.rubricConfig === 'object' &&
          draftResult.rubricConfig &&
          !Array.isArray(draftResult.rubricConfig)
            ? (draftResult.rubricConfig as Record<string, unknown>)
            : {},
        scaleScore: draftResult.scaleScore,
        passFail: draftResult.passFail,
        measurementValue: draftResult.measurementValue,
        measurementUnit: draftResult.measurementUnit,
        scoreData: draftResult.scoreData ?? {},
        notes: draftResult.notes.trim() || null,
        sortOrder: activeItem.sort_order,
      },
    })

    if (!saveResult.success) {
      setPending(false)
      toast.error(saveResult.error)
      return
    }

    const { assessmentId, resultId, result: savedRow } = saveResult.data
    const mediaFailures: string[] = []

    for (const mediaId of draftResult.removedMediaIds) {
      const deleted = await deleteAssessmentMedia(mediaId)
      if (!deleted.success) {
        mediaFailures.push('Could not remove a file.')
      }
    }

    for (const staged of draftResult.stagedMedia) {
      const uploaded = await uploadStagedMedia({
        clientId: member.clientId,
        assessmentId,
        resultId,
        file: staged.file,
      })
      if (!uploaded.success) {
        mediaFailures.push(`${uploaded.fileName}: ${uploaded.error}`)
      }
      URL.revokeObjectURL(staged.previewUrl)
    }

    setPending(false)

    setDetail((current) => {
      if (!current) return current
      const previous = current.results.find((row) => row.id === resultId)
      const keptMedia = (previous?.media ?? []).filter(
        (media) => !draftResult.removedMediaIds.includes(media.id)
      )
      const withoutOld = current.results.filter((row) => row.id !== resultId)
      return {
        ...current,
        results: [...withoutOld, { ...savedRow, media: keptMedia }],
      }
    })

    if (mediaFailures.length > 0) {
      toast.warning(
        `Score saved, but ${mediaFailures.length} media upload(s) failed.`
      )
    } else {
      toast.success(`${member.name} scored`)
    }

    if (advance) {
      const next = nextUnscoredMember(member.clientId)
      if (next) {
        const existing = resultsByKey.get(`${activeItem.id}:${next.clientId}`) ?? null
        setDraftResult(buildEditableResult(activeItem, existing))
        setActiveTest((current) =>
          current ? { ...current, view: 'score', member: next } : current
        )
        return
      }
    }

    backToRoster()
  }

  async function handleCompleteSession() {
    setCompleting(true)
    const result = await completeTeamAssessmentSession({ sessionId })
    setCompleting(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Team assessment completed')
    setDetail((current) =>
      current
        ? { ...current, session: { ...current.session, status: 'completed' } }
        : current
    )
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2"
          onClick={onExit}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">
            {scoredCount} of {totalScores} scores
          </p>
          {isCompleted ? (
            <Badge variant="success-soft">Completed</Badge>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleCompleteSession()}
              disabled={completing}
            >
              {completing ? 'Completing…' : 'Mark complete'}
            </Button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold">{session.title ?? 'Team assessment'}</h3>
        <p className="text-muted-foreground text-sm">
          {formatAssessmentDate(session.assessed_at)} · {members.length} athlete
          {members.length === 1 ? '' : 's'} · Tap a test, then pick each athlete to
          score.
        </p>
      </div>

      <div className="grid gap-2">
        {items.map((item) => {
          const itemScored = scoredCountForItem(item.id)
          const done = itemScored === members.length && members.length > 0
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setActiveTest({ itemId: item.id, view: 'roster', member: null })
              }
              className={cn(
                'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition hover:bg-muted/50',
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
                  <ClipboardCheck className="size-4" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.item_name}</p>
                <p className="text-muted-foreground text-xs">
                  {ASSESSMENT_CATEGORY_LABELS[item.item_category]}
                  {' · '}
                  {itemScored}/{members.length} scored
                </p>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </button>
          )
        })}
      </div>

      <Dialog
        open={Boolean(activeTest && activeItem)}
        onOpenChange={(open) => {
          if (!open) closeTestDialog()
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          {activeItem && activeTest?.view === 'roster' ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeItem.item_name}</DialogTitle>
                <DialogDescription>
                  Select an athlete to score. {scoredCountForItem(activeItem.id)} of{' '}
                  {members.length} scored.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                {members.map((member) => {
                  const existing =
                    resultsByKey.get(`${activeItem.id}:${member.clientId}`) ?? null
                  return (
                    <button
                      key={member.clientId}
                      type="button"
                      onClick={() => openScoreView(member)}
                      className="rounded-xl border px-3 py-2.5 text-left transition hover:bg-muted/50"
                    >
                      <PersonRow
                        name={member.name}
                        avatarUrl={member.avatarUrl}
                        meta={
                          existing ? (
                            <span className="text-foreground">
                              {formatAssessmentScore(existing)}
                            </span>
                          ) : (
                            <span>Not scored</span>
                          )
                        }
                        trailing={
                          <span
                            className={cn(
                              'text-xs font-medium',
                              existing ? 'text-muted-foreground' : 'text-brand'
                            )}
                          >
                            {existing ? 'Edit' : 'Score'}
                          </span>
                        }
                      />
                    </button>
                  )
                })}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeTestDialog}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {activeItem && activeTest?.view === 'score' && activeTest.member && draftResult ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {activeItem.item_name} — {activeTest.member.name}
                </DialogTitle>
                <DialogDescription>
                  Score this test, add notes, and attach photos or video.
                </DialogDescription>
              </DialogHeader>
              <AssessmentResultFields
                result={draftResult}
                bare
                disabled={pending}
                onChange={setDraftResult}
              />
              <DialogFooter className="gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={backToRoster}
                  disabled={pending}
                >
                  <ChevronLeft className="size-4" />
                  Athletes
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSaveScore(false)}
                    disabled={pending}
                  >
                    {pending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSaveScore(true)}
                    disabled={pending}
                  >
                    Save &amp; next athlete
                  </Button>
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
