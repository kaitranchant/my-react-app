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

function FormSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('grid gap-2', className)}>
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
        {title}
      </p>
      <div className="grid gap-4 rounded-xl border p-4">{children}</div>
    </section>
  )
}

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
      <Label htmlFor={id}>
        {label}{' '}
        <span className="text-muted-foreground font-normal">({unit})</span>
      </Label>
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
      />
    </div>
  )
}

function GradedLevelSelector({
  label,
  value,
  onChange,
  disabled,
  scale,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  scale: GradedScaleConfig
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
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
                'flex min-h-11 items-center justify-center rounded-lg border text-center transition-colors disabled:opacity-50 sm:min-h-12',
                gradedScaleButtonClass(level, selected, scale.tone)
              )}
            >
              <span className="text-sm font-semibold">{level}</span>
            </button>
          )
        })}
      </div>
      <div className="text-muted-foreground flex justify-between px-0.5 text-[10px] leading-tight sm:text-xs">
        <span>{scale.labels[0]}</span>
        <span>{scale.labels[4]}</span>
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
    <div className="grid gap-2">
      <div className="space-y-1">
        <Label htmlFor="check-in-coach-notes">Coach response</Label>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Optional — the client will see this after you mark the check-in as reviewed.
        </p>
      </div>
      <Textarea
        id="check-in-coach-notes"
        rows={4}
        placeholder="Share encouragement, adjustments, or next steps…"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
        disabled={disabled}
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
      <FormSection title="Client & date">
        {showClientPicker ? (
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
        ) : null}

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

        <div className="grid grid-cols-2 gap-3">
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
      </FormSection>

      <FormSection title="Wellness">
        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <GradedLevelSelector
            label="Sleep quality"
            value={values.sleepQuality}
            onChange={(value) => updateField('sleepQuality', value)}
            disabled={disabled || isSubmitting}
            scale={CHECK_IN_SCALES.sleepQuality}
          />
          <GradedLevelSelector
            label="Stress level"
            value={values.calmLevel}
            onChange={(value) => updateField('calmLevel', value)}
            disabled={disabled || isSubmitting}
            scale={CHECK_IN_SCALES.calm}
          />
          <GradedLevelSelector
            label="Energy"
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
      </FormSection>

      <FormSection title="Training readiness">
        <GradedLevelSelector
          label="Nutrition adherence"
          value={values.nutritionAdherence}
          onChange={(value) => updateField('nutritionAdherence', value)}
          disabled={disabled || isSubmitting}
          scale={CHECK_IN_SCALES.nutrition}
        />
        <GradedLevelSelector
          label="Muscle soreness"
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
            placeholder="Which muscle groups? Any tightness?"
            value={values.sorenessNotes ?? ''}
            onChange={(event) =>
              updateField('sorenessNotes', event.target.value || null)
            }
            disabled={disabled || isSubmitting}
          />
        </div>

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Injury or pain</Label>
            <p className="text-muted-foreground text-xs">
              Flag anything before the next session.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={values.hasPain ? 'outline' : 'default'}
              className={cn(
                'h-10',
                !values.hasPain ? 'bg-brand hover:bg-brand/90' : undefined
              )}
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
              className={cn(
                'h-10',
                values.hasPain ? 'bg-red-600 hover:bg-red-600/90' : undefined
              )}
              onClick={() => updateField('hasPain', true)}
              disabled={disabled || isSubmitting}
            >
              Pain or injury
            </Button>
          </div>
          {values.hasPain ? (
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
          ) : null}
        </div>
      </FormSection>

      {(variant === 'client' || checkInId) && (
        <ProgressPhotoUpload
          checkInId={checkInId}
          photos={progressPhotos}
          variant={variant}
          disabled={disabled || isSubmitting}
        />
      )}

      {variant === 'coach' && !checkInId && (
        <div className="rounded-xl border border-dashed p-4">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Save the check-in first to view client progress photos here.
          </p>
        </div>
      )}

      <FormSection title={variant === 'client' ? 'Your notes' : 'Coach notes'}>
        <div className="grid gap-2">
          <div className="space-y-1">
            <Label htmlFor="check-in-client-notes">
              {variant === 'client'
                ? 'Notes for your coach'
                : "Client's reported feedback"}
            </Label>
            {variant === 'coach' ? (
              <p className="text-muted-foreground text-xs">
                Their words, not your coaching notes.
              </p>
            ) : null}
          </div>
          <Textarea
            id="check-in-client-notes"
            rows={4}
            placeholder={
              variant === 'client'
                ? 'How did the week go? Any wins or challenges?'
                : "What did the client say about how they're feeling?"
            }
            value={values.clientNotes ?? ''}
            onChange={(event) =>
              updateField('clientNotes', event.target.value || null)
            }
            disabled={disabled || isSubmitting}
          />
        </div>

        {variant === 'coach' ? (
          <CoachResponseField
            value={values.coachNotes}
            onChange={(value) => updateField('coachNotes', value)}
            disabled={disabled || isSubmitting}
          />
        ) : null}
      </FormSection>

      {validationError && (
        <p className="text-destructive text-sm">{validationError}</p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          className="w-full sm:w-auto"
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
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
          {form}
          <CheckInHistoryPanel checkIns={recentCheckIns} />
        </div>
      ) : (
        form
      )}
    </form>
  )
}
