'use client'

import * as React from 'react'
import { ImagePlus, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ASSESSMENT_MEDIA_FILE_ACCEPT,
  ASSESSMENT_MEDIA_UPLOAD_HINT,
  humanizeObservationKey,
  isAssessmentMediaImage,
  parseAssessmentRubricConfig,
  parseAssessmentScoreData,
  resolveAssessmentMediaContentType,
  getAssessmentMediaMaxUploadBytes,
  type AssessmentScoreData,
} from '@/lib/assessments'
import { cn } from '@/lib/utils'
import type {
  AssessmentItemCategory,
  AssessmentRubricType,
  ClientAssessmentMediaWithUrl,
  Json,
} from 'app/types/database'
import { toast } from 'sonner'

export type StagedAssessmentMedia = {
  localId: string
  file: File
  previewUrl: string
}

export type EditableAssessmentResult = {
  clientKey: string
  assessmentItemId: string | null
  itemName: string
  itemCategory: AssessmentItemCategory
  rubricType: AssessmentRubricType
  rubricConfig: Json
  scaleScore: number | null
  passFail: boolean | null
  measurementValue: number | null
  measurementUnit: string | null
  scoreData: AssessmentScoreData
  notes: string
  sortOrder: number
  existingMedia: ClientAssessmentMediaWithUrl[]
  stagedMedia: StagedAssessmentMedia[]
  removedMediaIds: string[]
}

type AssessmentResultFieldsProps = {
  result: EditableAssessmentResult
  onChange: (next: EditableAssessmentResult) => void
  onRemove?: () => void
  disabled?: boolean
  bare?: boolean
}

function ChoiceButton({
  selected,
  onClick,
  disabled,
  children,
  tone = 'brand',
}: {
  selected: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  tone?: 'brand' | 'pass' | 'fail'
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-lg border px-3 py-2 text-sm font-medium transition',
        selected &&
          tone === 'brand' &&
          'border-brand bg-brand text-brand-foreground',
        selected &&
          tone === 'pass' &&
          'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        selected &&
          tone === 'fail' &&
          'border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-300',
        !selected && 'hover:bg-muted/60'
      )}
    >
      {children}
    </button>
  )
}

function ScaleButtons({
  values,
  labels,
  selected,
  onSelect,
  disabled,
}: {
  values: number[]
  labels?: string[]
  selected: number | null
  onSelect: (value: number | null) => void
  disabled?: boolean
}) {
  const min = values[0] ?? 0
  return (
    <div
      className={cn(
        'grid gap-1.5',
        values.length <= 4 ? 'grid-cols-4' : 'grid-cols-5'
      )}
    >
      {values.map((value) => {
        const isSelected = selected === value
        const label = labels?.[value - min]
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(isSelected ? null : value)}
            className={cn(
              'rounded-lg border px-2 py-2 text-center transition',
              isSelected
                ? value === min && labels?.[0]?.toLowerCase().includes('pain')
                  ? 'border-rose-500/60 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'border-brand bg-brand text-brand-foreground'
                : 'hover:bg-muted/60'
            )}
          >
            <span className="block text-sm font-semibold">{value}</span>
            {label ? (
              <span className="block text-[10px] leading-tight opacity-80">
                {label}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function AssessmentResultFields({
  result,
  onChange,
  onRemove,
  disabled,
  bare = false,
}: AssessmentResultFieldsProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const config = parseAssessmentRubricConfig(
    result.rubricType,
    result.rubricConfig
  )
  const scoreData = parseAssessmentScoreData(result.scoreData as Json)

  React.useEffect(() => {
    return () => {
      for (const media of result.stagedMedia) {
        URL.revokeObjectURL(media.previewUrl)
      }
    }
    // Only revoke when this result unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function update(partial: Partial<EditableAssessmentResult>) {
    onChange({ ...result, ...partial })
  }

  function updateScoreData(partial: AssessmentScoreData) {
    update({ scoreData: { ...scoreData, ...partial } })
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const nextStaged = [...result.stagedMedia]

    for (const file of Array.from(fileList)) {
      const contentType = resolveAssessmentMediaContentType(file)
      if (!contentType) {
        toast.error(`${file.name}: unsupported file type.`)
        continue
      }
      const maxBytes = getAssessmentMediaMaxUploadBytes(contentType)
      if (file.size > maxBytes) {
        toast.error(
          contentType.startsWith('image/')
            ? `${file.name}: photos must be under 10 MB.`
            : `${file.name}: videos must be under 50 MB.`
        )
        continue
      }
      nextStaged.push({
        localId: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }

    update({ stagedMedia: nextStaged })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeStaged(localId: string) {
    const target = result.stagedMedia.find((media) => media.localId === localId)
    if (target) URL.revokeObjectURL(target.previewUrl)
    update({
      stagedMedia: result.stagedMedia.filter((media) => media.localId !== localId),
    })
  }

  function removeExisting(mediaId: string) {
    update({
      existingMedia: result.existingMedia.filter((media) => media.id !== mediaId),
      removedMediaIds: [...result.removedMediaIds, mediaId],
    })
  }

  const scaleMin = config.min ?? 0
  const scaleMax = config.max ?? 3
  const scaleValues: number[] = []
  for (let value = scaleMin; value <= scaleMax; value += 1) {
    scaleValues.push(value)
  }

  const unitOptions = [
    config.unit,
    ...(config.alternateUnits ?? []),
  ].filter((unit): unit is string => Boolean(unit))

  return (
    <div className={cn('grid gap-3', !bare && 'rounded-xl border p-3')}>
      {!bare ? (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{result.itemName}</p>
            <p className="text-muted-foreground text-xs capitalize">
              {result.rubricType.replace('_', ' ')}
            </p>
          </div>
          {onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              disabled={disabled}
              aria-label={`Remove ${result.itemName}`}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      {result.rubricType === 'scale' ? (
        config.bilateral ? (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>Left</Label>
              <ScaleButtons
                values={scaleValues}
                labels={config.labels}
                selected={
                  typeof scoreData.left === 'number' ? scoreData.left : null
                }
                onSelect={(value) => updateScoreData({ left: value })}
                disabled={disabled}
              />
            </div>
            <div className="grid gap-2">
              <Label>Right</Label>
              <ScaleButtons
                values={scaleValues}
                labels={config.labels}
                selected={
                  typeof scoreData.right === 'number' ? scoreData.right : null
                }
                onSelect={(value) => updateScoreData({ right: value })}
                disabled={disabled}
              />
            </div>
            {(scoreData.left === scaleMin || scoreData.right === scaleMin) &&
            config.painFlag ? (
              <p className="text-rose-600 dark:text-rose-300 text-xs">
                Score 0 (pain) flags this pattern for injury review.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-2">
            <Label>Score</Label>
            <ScaleButtons
              values={scaleValues}
              labels={config.labels}
              selected={result.scaleScore}
              onSelect={(value) => update({ scaleScore: value })}
              disabled={disabled}
            />
            {result.scaleScore === scaleMin && config.painFlag ? (
              <p className="text-rose-600 dark:text-rose-300 text-xs">
                Score 0 (pain) flags this pattern for injury review.
              </p>
            ) : null}
          </div>
        )
      ) : null}

      {result.rubricType === 'pass_fail' ? (
        <div className="grid gap-3">
          {config.bilateral ? (
            <>
              <div className="grid gap-2">
                <Label>Left</Label>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    selected={scoreData.left === true}
                    onClick={() => updateScoreData({ left: true })}
                    disabled={disabled}
                    tone="pass"
                  >
                    {config.passLabel ?? 'Pass'}
                  </ChoiceButton>
                  <ChoiceButton
                    selected={scoreData.left === false}
                    onClick={() => updateScoreData({ left: false })}
                    disabled={disabled}
                    tone="fail"
                  >
                    {config.failLabel ?? 'Fail'}
                  </ChoiceButton>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Right</Label>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    selected={scoreData.right === true}
                    onClick={() => updateScoreData({ right: true })}
                    disabled={disabled}
                    tone="pass"
                  >
                    {config.passLabel ?? 'Pass'}
                  </ChoiceButton>
                  <ChoiceButton
                    selected={scoreData.right === false}
                    onClick={() => updateScoreData({ right: false })}
                    disabled={disabled}
                    tone="fail"
                  >
                    {config.failLabel ?? 'Fail'}
                  </ChoiceButton>
                </div>
              </div>
            </>
          ) : config.observations?.length ? null : (
            <div className="grid gap-2">
              <Label>Result</Label>
              <div className="grid grid-cols-2 gap-2">
                <ChoiceButton
                  selected={result.passFail === true}
                  onClick={() => update({ passFail: true })}
                  disabled={disabled}
                  tone="pass"
                >
                  {config.passLabel ?? 'Pass'}
                </ChoiceButton>
                <ChoiceButton
                  selected={result.passFail === false}
                  onClick={() => update({ passFail: false })}
                  disabled={disabled}
                  tone="fail"
                >
                  {config.failLabel ?? 'Fail'}
                </ChoiceButton>
              </div>
            </div>
          )}

          {config.observations?.length ? (
            <div className="grid gap-2">
              <Label>Observations</Label>
              <div className="grid gap-2">
                {config.observations.map((key) => {
                  const present = scoreData.observations?.[key]
                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-1.5 rounded-lg border p-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm">
                        {humanizeObservationKey(key)}
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 sm:w-44">
                        <ChoiceButton
                          selected={present === false}
                          onClick={() =>
                            updateScoreData({
                              observations: {
                                ...(scoreData.observations ?? {}),
                                [key]: false,
                              },
                            })
                          }
                          disabled={disabled}
                          tone="pass"
                        >
                          Absent
                        </ChoiceButton>
                        <ChoiceButton
                          selected={present === true}
                          onClick={() =>
                            updateScoreData({
                              observations: {
                                ...(scoreData.observations ?? {}),
                                [key]: true,
                              },
                            })
                          }
                          disabled={disabled}
                          tone="fail"
                        >
                          Present
                        </ChoiceButton>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {result.rubricType === 'measurement' ? (
        config.fields?.length ? (
          <div className="grid gap-3">
            {config.fields.map((field) => (
              <div key={field.key} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <div className="grid gap-2">
                  <Label htmlFor={`${result.clientKey}-${field.key}`}>
                    {field.label}
                  </Label>
                  <Input
                    id={`${result.clientKey}-${field.key}`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={scoreData.fields?.[field.key] ?? ''}
                    onChange={(event) =>
                      updateScoreData({
                        fields: {
                          ...(scoreData.fields ?? {}),
                          [field.key]:
                            event.target.value === ''
                              ? null
                              : Number(event.target.value),
                        },
                      })
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Unit</Label>
                  <Input
                    value={field.unit ?? config.unit ?? ''}
                    disabled
                    className="sm:w-24"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : config.bilateral ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(['left', 'right'] as const).map((side) => (
              <div key={side} className="grid gap-2">
                <Label htmlFor={`${result.clientKey}-${side}`}>
                  {side === 'left' ? 'Left' : 'Right'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id={`${result.clientKey}-${side}`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={
                      typeof scoreData[side] === 'number' ? scoreData[side] : ''
                    }
                    onChange={(event) =>
                      updateScoreData({
                        [side]:
                          event.target.value === ''
                            ? null
                            : Number(event.target.value),
                      })
                    }
                    disabled={disabled}
                  />
                  <Input
                    value={result.measurementUnit ?? config.unit ?? ''}
                    onChange={(event) =>
                      update({ measurementUnit: event.target.value || null })
                    }
                    disabled={disabled}
                    className="w-20"
                    list={
                      unitOptions.length > 1
                        ? `${result.clientKey}-units`
                        : undefined
                    }
                  />
                </div>
              </div>
            ))}
            {unitOptions.length > 1 ? (
              <datalist id={`${result.clientKey}-units`}>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor={`measurement-${result.clientKey}`}>
                Measurement
              </Label>
              <Input
                id={`measurement-${result.clientKey}`}
                type="number"
                inputMode="decimal"
                step="any"
                value={result.measurementValue ?? ''}
                onChange={(event) =>
                  update({
                    measurementValue:
                      event.target.value === ''
                        ? null
                        : Number(event.target.value),
                  })
                }
                disabled={disabled}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`unit-${result.clientKey}`}>Unit</Label>
              <Input
                id={`unit-${result.clientKey}`}
                value={result.measurementUnit ?? config.unit ?? ''}
                onChange={(event) =>
                  update({ measurementUnit: event.target.value || null })
                }
                disabled={disabled}
                className="sm:w-24"
                list={
                  unitOptions.length > 1
                    ? `${result.clientKey}-units`
                    : undefined
                }
              />
              {unitOptions.length > 1 ? (
                <datalist id={`${result.clientKey}-units`}>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit} />
                  ))}
                </datalist>
              ) : null}
            </div>
          </div>
        )
      ) : null}

      {result.rubricType === 'questionnaire' ? (
        <div className="grid gap-3">
          {config.mode === 'multi_yes_no' ? (
            <>
              {(config.questions ?? []).map((question) => {
                const answer = scoreData.answers?.[question.id]
                return (
                  <div key={question.id} className="grid gap-2 rounded-lg border p-2">
                    <p className="text-sm">{question.text}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <ChoiceButton
                        selected={answer === false}
                        onClick={() =>
                          updateScoreData({
                            answers: {
                              ...(scoreData.answers ?? {}),
                              [question.id]: false,
                            },
                          })
                        }
                        disabled={disabled}
                        tone="pass"
                      >
                        No
                      </ChoiceButton>
                      <ChoiceButton
                        selected={answer === true}
                        onClick={() =>
                          updateScoreData({
                            answers: {
                              ...(scoreData.answers ?? {}),
                              [question.id]: true,
                            },
                          })
                        }
                        disabled={disabled}
                        tone="fail"
                      >
                        Yes
                      </ChoiceButton>
                    </div>
                  </div>
                )
              })}
              {config.escalateOnYes &&
              Object.values(scoreData.answers ?? {}).some(
                (answer) => answer === true
              ) ? (
                <p className="text-amber-700 dark:text-amber-300 text-xs">
                  One or more “Yes” answers — medical clearance may be required.
                </p>
              ) : null}
            </>
          ) : null}

          {config.mode === 'yes_no_text' ? (
            <>
              <div className="grid gap-2">
                <Label>{config.prompt ?? 'Response'}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <ChoiceButton
                    selected={scoreData.yesNo === false}
                    onClick={() => updateScoreData({ yesNo: false })}
                    disabled={disabled}
                    tone="pass"
                  >
                    {config.noLabel ?? 'No'}
                  </ChoiceButton>
                  <ChoiceButton
                    selected={scoreData.yesNo === true}
                    onClick={() => updateScoreData({ yesNo: true })}
                    disabled={disabled}
                    tone="fail"
                  >
                    {config.yesLabel ?? 'Yes'}
                  </ChoiceButton>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`q-text-${result.clientKey}`}>Details</Label>
                <Textarea
                  id={`q-text-${result.clientKey}`}
                  rows={2}
                  value={scoreData.text ?? ''}
                  onChange={(event) =>
                    updateScoreData({ text: event.target.value || null })
                  }
                  placeholder="Optional details…"
                  disabled={disabled}
                />
              </div>
            </>
          ) : null}

          {config.mode === 'scale_text' ? (
            <>
              <div className="grid gap-2">
                <Label>{config.prompt ?? 'Rating'}</Label>
                <ScaleButtons
                  values={(() => {
                    const values: number[] = []
                    const min = config.min ?? 1
                    const max = config.max ?? 5
                    for (let value = min; value <= max; value += 1) {
                      values.push(value)
                    }
                    return values
                  })()}
                  labels={config.labels}
                  selected={
                    typeof scoreData.scale === 'number' ? scoreData.scale : null
                  }
                  onSelect={(value) => updateScoreData({ scale: value })}
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`q-scale-text-${result.clientKey}`}>Notes</Label>
                <Textarea
                  id={`q-scale-text-${result.clientKey}`}
                  rows={2}
                  value={scoreData.text ?? ''}
                  onChange={(event) =>
                    updateScoreData({ text: event.target.value || null })
                  }
                  placeholder="Optional details…"
                  disabled={disabled}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {result.rubricType !== 'questionnaire' ? (
        <div className="grid gap-2">
          <Label htmlFor={`notes-${result.clientKey}`}>Notes</Label>
          <Textarea
            id={`notes-${result.clientKey}`}
            rows={2}
            value={result.notes}
            onChange={(event) => update({ notes: event.target.value })}
            placeholder="Observations for this movement…"
            disabled={disabled}
          />
        </div>
      ) : null}

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Photos & videos</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Add media
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ASSESSMENT_MEDIA_FILE_ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>
        <p className="text-muted-foreground text-xs">{ASSESSMENT_MEDIA_UPLOAD_HINT}</p>
        {(result.existingMedia.length > 0 || result.stagedMedia.length > 0) && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {result.existingMedia.map((media) => (
              <div
                key={media.id}
                className="relative overflow-hidden rounded-lg border"
              >
                {isAssessmentMediaImage(media.content_type) && media.signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media.signedUrl}
                    alt={media.file_name ?? 'Assessment media'}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <div className="bg-muted text-muted-foreground flex h-24 items-center justify-center text-xs">
                    Video
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-1 right-1 size-7"
                  disabled={disabled}
                  onClick={() => removeExisting(media.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {result.stagedMedia.map((media) => (
              <div
                key={media.localId}
                className="relative overflow-hidden rounded-lg border"
              >
                {media.file.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media.previewUrl}
                    alt={media.file.name}
                    className="h-24 w-full object-cover"
                  />
                ) : (
                  <video
                    src={media.previewUrl}
                    className="h-24 w-full object-cover"
                    muted
                  />
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-1 right-1 size-7"
                  disabled={disabled}
                  onClick={() => removeStaged(media.localId)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
