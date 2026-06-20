'use client'

import * as React from 'react'

import { CheckInHistoryPanel } from '@/components/check-ins/check-in-history-panel'
import { ProgressPhotoUpload } from '@/components/progress-photos/progress-photo-upload'
import { Button } from '@/components/ui/button'
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
  CHECK_IN_SCALES,
  createEmptyCheckInValues,
  gradedScaleButtonClass,
  type GradedScaleConfig,
} from '@/lib/check-ins'
import { cn } from '@/lib/utils'
import type { CheckInFormValues } from '@/lib/validations/check-in'
import type { Client, ClientCheckIn, ClientProgressPhotoWithUrl } from 'app/types/database'

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  disabled,
  step = '0.1',
  max,
}: {
  id: string
  label: string
  unit: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  step?: string
  max?: number
}) {
  function parseOptionalNumber(raw: string): number | null {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min="0"
          max={max}
          placeholder="Optional"
          value={value ?? ''}
          onChange={(event) => onChange(parseOptionalNumber(event.target.value))}
          disabled={disabled}
          className="pr-14"
        />
        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium">
          {unit}
        </span>
      </div>
    </div>
  )
}

function GradedLevelSelector({
  label,
  hint,
  value,
  onChange,
  disabled,
  scale,
}: {
  label: string
  hint?: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  scale: GradedScaleConfig
}) {
  return (
    <div className="grid gap-2">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {[1, 2, 3, 4, 5].map((level) => {
          const selected = value === level
          return (
            <button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onChange(selected ? null : level)}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center rounded-lg border px-1 py-2 text-center transition-colors disabled:opacity-50',
                gradedScaleButtonClass(level, selected, scale.tone)
              )}
            >
              <span className="text-sm font-semibold">{level}</span>
              <span className="mt-1 hidden text-[10px] leading-tight sm:block">
                {scale.labels[level - 1]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CoachResponseField({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
}) {
  return (
    <div className="border-brand/20 bg-brand/5 rounded-xl border-2 p-4">
      <div className="mb-3 space-y-1">
        <Label htmlFor="check-in-coach-notes" className="text-brand text-sm">
          Coach response
        </Label>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Your dedicated coaching moment — feedback the client will see after review.
        </p>
      </div>
      <Textarea
        id="check-in-coach-notes"
        rows={4}
        placeholder="Share encouragement, adjustments, or next steps…"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
        className="bg-background border-brand/20"
      />
    </div>
  )
}

export type CheckInFormProps = {
  variant: 'client' | 'coach'
  initialValues?: CheckInFormValues
  recentCheckIns?: ClientCheckIn[]
  checkInId?: string | null
  progressPhotos?: ClientProgressPhotoWithUrl[]
  clients?: Pick<Client, 'id' | 'full_name'>[]
  selectedClientId?: string
  onClientChange?: (clientId: string) => void
  onSubmit: (values: CheckInFormValues) => Promise<{ success: boolean; error?: string }>
  onCancel?: () => void
  submitLabel?: string
  disabled?: boolean
  weightUnit?: import('app/types/database').WeightUnit
}

export function CheckInForm({
  variant,
  initialValues,
  recentCheckIns = [],
  checkInId = null,
  progressPhotos = [],
  clients,
  selectedClientId,
  onClientChange,
  onSubmit,
  onCancel,
  submitLabel,
  disabled = false,
  weightUnit = 'lbs',
}: CheckInFormProps) {
  const [values, setValues] = React.useState(
    initialValues ?? createEmptyCheckInValues()
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [validationError, setValidationError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (initialValues) {
      setValues(initialValues)
    }
  }, [initialValues])

  function updateField<K extends keyof CheckInFormValues>(
    key: K,
    value: CheckInFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setValidationError(null)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (values.hasPain && !values.painNotes?.trim()) {
      setValidationError('Please describe the pain or injury before submitting.')
      return
    }

    setIsSubmitting(true)
    const result = await onSubmit(values)
    setIsSubmitting(false)
    if (result.success) {
      onCancel?.()
    }
  }

  const showClientPicker =
    variant === 'coach' && clients && clients.length > 0 && onClientChange

  const form = (
    <div className="grid gap-5">
      {showClientPicker && (
        <div className="grid gap-2">
          <Label htmlFor="check-in-client">Client</Label>
          <Select
            value={selectedClientId}
            onValueChange={onClientChange}
            disabled={disabled || isSubmitting}
          >
            <SelectTrigger id="check-in-client">
              <SelectValue placeholder="Select a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="check-in-date">Date</Label>
        <Input
          id="check-in-date"
          type="date"
          value={values.checkInDate}
          onChange={(event) => updateField('checkInDate', event.target.value)}
          disabled={disabled || isSubmitting}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          id="check-in-weight"
          label="Weight"
          unit={weightUnit}
          value={values.weight}
          onChange={(value) => updateField('weight', value)}
          disabled={disabled || isSubmitting}
        />
        <NumberField
          id="check-in-sleep"
          label="Sleep duration"
          unit="hrs"
          step="0.5"
          max={24}
          value={values.sleepHours}
          onChange={(value) => updateField('sleepHours', value)}
          disabled={disabled || isSubmitting}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GradedLevelSelector
          label="Sleep quality"
          hint="How rested did you feel?"
          value={values.sleepQuality}
          onChange={(value) => updateField('sleepQuality', value)}
          disabled={disabled || isSubmitting}
          scale={CHECK_IN_SCALES.sleepQuality}
        />
        <GradedLevelSelector
          label="Calm / stress"
          hint="1 = very stressed, 5 = very calm"
          value={values.calmLevel}
          onChange={(value) => updateField('calmLevel', value)}
          disabled={disabled || isSubmitting}
          scale={CHECK_IN_SCALES.calm}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GradedLevelSelector
          label="Energy"
          hint="1 = exhausted, 5 = high energy"
          value={values.energyLevel}
          onChange={(value) => updateField('energyLevel', value)}
          disabled={disabled || isSubmitting}
          scale={CHECK_IN_SCALES.energy}
        />
        <GradedLevelSelector
          label="Motivation to train"
          value={values.motivationLevel}
          onChange={(value) => updateField('motivationLevel', value)}
          disabled={disabled || isSubmitting}
          scale={CHECK_IN_SCALES.motivation}
        />
      </div>

      <GradedLevelSelector
        label="Nutrition adherence"
        hint="How well did you stick to your nutrition plan?"
        value={values.nutritionAdherence}
        onChange={(value) => updateField('nutritionAdherence', value)}
        disabled={disabled || isSubmitting}
        scale={CHECK_IN_SCALES.nutrition}
      />

      <div className="grid gap-4">
        <GradedLevelSelector
          label="Muscle soreness"
          hint="1 = none, 5 = severe"
          value={values.sorenessLevel}
          onChange={(value) => updateField('sorenessLevel', value)}
          disabled={disabled || isSubmitting}
          scale={CHECK_IN_SCALES.soreness}
        />
        <div className="grid gap-2">
          <Label htmlFor="check-in-soreness-notes">Soreness details</Label>
          <Textarea
            id="check-in-soreness-notes"
            rows={2}
            placeholder="Which muscle groups are sore? Any lingering tightness?"
            value={values.sorenessNotes ?? ''}
            onChange={(event) =>
              updateField('sorenessNotes', event.target.value || null)
            }
            disabled={disabled || isSubmitting}
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border p-4">
        <div className="space-y-1">
          <Label>Injury or pain</Label>
          <p className="text-muted-foreground text-xs">
            Flag anything your coach should know about before your next session.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={values.hasPain ? 'outline' : 'default'}
            className={!values.hasPain ? 'bg-brand hover:bg-brand/90' : undefined}
            onClick={() => {
              updateField('hasPain', false)
              updateField('painNotes', null)
            }}
            disabled={disabled || isSubmitting}
          >
            No pain
          </Button>
          <Button
            type="button"
            size="sm"
            variant={values.hasPain ? 'default' : 'outline'}
            className={values.hasPain ? 'bg-red-600 hover:bg-red-600/90' : undefined}
            onClick={() => updateField('hasPain', true)}
            disabled={disabled || isSubmitting}
          >
            Pain or injury
          </Button>
        </div>
        {values.hasPain && (
          <div className="grid gap-2">
            <Label htmlFor="check-in-pain-notes">Pain details</Label>
            <Textarea
              id="check-in-pain-notes"
              rows={3}
              placeholder="Where does it hurt? What movements aggravate it?"
              value={values.painNotes ?? ''}
              onChange={(event) =>
                updateField('painNotes', event.target.value || null)
              }
              disabled={disabled || isSubmitting}
            />
          </div>
        )}
      </div>

      {(variant === 'client' || checkInId) && (
        <ProgressPhotoUpload
          checkInId={checkInId}
          photos={progressPhotos}
          variant={variant}
          disabled={disabled || isSubmitting}
        />
      )}

      {variant === 'coach' && !checkInId && (
        <div className="rounded-lg border border-dashed p-4">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Save the check-in first to view client progress photos here.
          </p>
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="check-in-client-notes">
          {variant === 'client'
            ? 'Notes for your coach'
            : "Client's reported feedback"}
        </Label>
        <Textarea
          id="check-in-client-notes"
          rows={4}
          placeholder={
            variant === 'client'
              ? 'How did the week go? Any wins or challenges?'
              : 'Record what the client reported — their words, not your coaching notes.'
          }
          value={values.clientNotes ?? ''}
          onChange={(event) =>
            updateField('clientNotes', event.target.value || null)
          }
          disabled={disabled || isSubmitting}
        />
      </div>

      {variant === 'coach' && (
        <CoachResponseField
          value={values.coachNotes}
          onChange={(value) => updateField('coachNotes', value)}
          disabled={disabled || isSubmitting}
        />
      )}

      {validationError && (
        <p className="text-destructive text-sm">{validationError}</p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            disabled ||
            isSubmitting ||
            (showClientPicker && !selectedClientId)
          }
        >
          {isSubmitting
            ? 'Saving…'
            : submitLabel ?? (variant === 'client' ? 'Submit check-in' : 'Save check-in')}
        </Button>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      {recentCheckIns.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          {form}
          <CheckInHistoryPanel checkIns={recentCheckIns} />
        </div>
      ) : (
        form
      )}
    </form>
  )
}
