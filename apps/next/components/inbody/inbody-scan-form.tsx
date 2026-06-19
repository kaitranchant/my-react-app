'use client'

import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createEmptyInbodyScanValues } from '@/lib/inbody-scans'
import type { InbodyScanFormValues } from '@/lib/validations/inbody-scan'

function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  disabled,
  required = false,
  step = '0.1',
  max,
}: {
  id: string
  label: string
  unit: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  required?: boolean
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
        {label}
        {required ? ' *' : ''}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min="0"
          max={max}
          placeholder={required ? 'Required' : 'Optional'}
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

type InbodyScanFormProps = {
  initialValues?: InbodyScanFormValues
  submitLabel?: string
  disabled?: boolean
  onSubmit: (values: InbodyScanFormValues) => Promise<{ success: boolean; error?: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

export function InbodyScanForm({
  initialValues,
  submitLabel = 'Save scan',
  disabled = false,
  onSubmit,
  onSuccess,
  onCancel,
}: InbodyScanFormProps) {
  const [values, setValues] = React.useState<InbodyScanFormValues>(
    initialValues ?? createEmptyInbodyScanValues()
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (initialValues) {
      setValues(initialValues)
    }
  }, [initialValues])

  function updateField<K extends keyof InbodyScanFormValues>(
    key: K,
    value: InbodyScanFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    const result = await onSubmit(values)
    setIsSubmitting(false)

    if (result.success) {
      toast.success(initialValues ? 'Scan updated' : 'Scan saved')
      if (!initialValues) {
        setValues(createEmptyInbodyScanValues())
      }
      onSuccess?.()
    } else {
      toast.error(result.error ?? 'Something went wrong.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="scanDate">Scan date *</Label>
          <Input
            id="scanDate"
            type="date"
            value={values.scanDate}
            onChange={(event) => updateField('scanDate', event.target.value)}
            disabled={disabled || isSubmitting}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="scanTime">Scan time *</Label>
          <Input
            id="scanTime"
            type="time"
            value={values.scanTime}
            onChange={(event) => updateField('scanTime', event.target.value)}
            disabled={disabled || isSubmitting}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Body composition history</p>
          <p className="text-muted-foreground text-xs">
            Enter the three metrics shown on the InBody history graph.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            id="weightLbs"
            label="Weight"
            unit="lbs"
            value={values.weightLbs}
            onChange={(value) => updateField('weightLbs', value)}
            disabled={disabled || isSubmitting}
            required
          />
          <NumberField
            id="skeletalMuscleMassLbs"
            label="Skeletal muscle mass"
            unit="lbs"
            value={values.skeletalMuscleMassLbs}
            onChange={(value) => updateField('skeletalMuscleMassLbs', value)}
            disabled={disabled || isSubmitting}
            required
          />
          <NumberField
            id="percentBodyFat"
            label="Percent body fat"
            unit="%"
            value={values.percentBodyFat}
            onChange={(value) => updateField('percentBodyFat', value)}
            disabled={disabled || isSubmitting}
            required
            max={100}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Additional metrics</p>
          <p className="text-muted-foreground text-xs">
            Optional values from the rest of the InBody printout.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            id="totalBodyWaterLbs"
            label="Total body water"
            unit="lbs"
            value={values.totalBodyWaterLbs}
            onChange={(value) => updateField('totalBodyWaterLbs', value)}
            disabled={disabled || isSubmitting}
          />
          <NumberField
            id="dryLeanMassLbs"
            label="Dry lean mass"
            unit="lbs"
            value={values.dryLeanMassLbs}
            onChange={(value) => updateField('dryLeanMassLbs', value)}
            disabled={disabled || isSubmitting}
          />
          <NumberField
            id="bodyFatMassLbs"
            label="Body fat mass"
            unit="lbs"
            value={values.bodyFatMassLbs}
            onChange={(value) => updateField('bodyFatMassLbs', value)}
            disabled={disabled || isSubmitting}
          />
          <NumberField
            id="bmi"
            label="BMI"
            unit="kg/m²"
            value={values.bmi}
            onChange={(value) => updateField('bmi', value)}
            disabled={disabled || isSubmitting}
          />
          <NumberField
            id="leanBodyMassLbs"
            label="Lean body mass"
            unit="lbs"
            value={values.leanBodyMassLbs}
            onChange={(value) => updateField('leanBodyMassLbs', value)}
            disabled={disabled || isSubmitting}
          />
          <NumberField
            id="basalMetabolicRateKcal"
            label="Basal metabolic rate"
            unit="kcal"
            value={values.basalMetabolicRateKcal}
            onChange={(value) => updateField('basalMetabolicRateKcal', value)}
            disabled={disabled || isSubmitting}
            step="1"
          />
          <NumberField
            id="skeletalMuscleIndex"
            label="Skeletal muscle index"
            unit="kg/m²"
            value={values.skeletalMuscleIndex}
            onChange={(value) => updateField('skeletalMuscleIndex', value)}
            disabled={disabled || isSubmitting}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={3}
          value={values.notes ?? ''}
          onChange={(event) =>
            updateField('notes', event.target.value.trim() || null)
          }
          placeholder="Optional context about this scan…"
          disabled={disabled || isSubmitting}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
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
        <Button type="submit" disabled={disabled || isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
