'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createEmptyInbodyScanValues } from '@/lib/inbody-scans'
import { cn } from '@/lib/utils'
import type { InbodyScanFormValues } from '@/lib/validations/inbody-scan'

const OPTIONAL_METRIC_COUNT = 7

function NumberField({
  id,
  label,
  shortLabel,
  unit,
  value,
  onChange,
  disabled,
  required = false,
  step = '0.1',
  max,
  placeholder,
}: {
  id: string
  label: string
  shortLabel?: string
  unit: string
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
  required?: boolean
  step?: string
  max?: number
  placeholder?: string
}) {
  function parseOptionalNumber(raw: string): number | null {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  return (
    <div className="grid min-w-0 gap-1 sm:gap-2">
      <Label htmlFor={id} className="text-[11px] leading-tight sm:text-sm">
        <span className="sm:hidden">{shortLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
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
          placeholder={
            placeholder ?? (required ? 'Required' : 'Optional')
          }
          value={value ?? ''}
          onChange={(event) => onChange(parseOptionalNumber(event.target.value))}
          disabled={disabled}
          className="h-10 py-2 pr-10 text-sm leading-normal sm:pr-14"
        />
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs font-medium sm:right-3">
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
  const [additionalOpen, setAdditionalOpen] = React.useState(false)

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
    <form onSubmit={handleSubmit} className="grid gap-4 sm:gap-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="grid gap-1 sm:gap-2">
          <Label htmlFor="scanDate" className="text-[11px] sm:text-sm">
            <span className="sm:hidden">Date *</span>
            <span className="hidden sm:inline">Scan date *</span>
          </Label>
          <Input
            id="scanDate"
            type="date"
            value={values.scanDate}
            onChange={(event) => updateField('scanDate', event.target.value)}
            disabled={disabled || isSubmitting}
            className="h-10 py-2 text-sm leading-normal"
            required
          />
        </div>
        <div className="grid gap-1 sm:gap-2">
          <Label htmlFor="scanTime" className="text-[11px] sm:text-sm">
            <span className="sm:hidden">Time *</span>
            <span className="hidden sm:inline">Scan time *</span>
          </Label>
          <Input
            id="scanTime"
            type="time"
            value={values.scanTime}
            onChange={(event) => updateField('scanTime', event.target.value)}
            disabled={disabled || isSubmitting}
            className="h-10 py-2 text-sm leading-normal"
            required
          />
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <div className="hidden sm:block">
          <p className="text-sm font-medium">Body composition history</p>
          <p className="text-muted-foreground text-xs">
            Enter the three metrics shown on the InBody history graph.
          </p>
        </div>
        <p className="text-primary flex items-center gap-1.5 text-[11px] font-medium sm:hidden">
          <span className="bg-primary size-1.5 shrink-0 rounded-full" />
          Required field
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <NumberField
            id="weightLbs"
            label="Weight"
            unit="lbs"
            value={values.weightLbs}
            onChange={(value) => updateField('weightLbs', value)}
            disabled={disabled || isSubmitting}
            required
            placeholder="e.g. 178.5"
          />
          <NumberField
            id="skeletalMuscleMassLbs"
            label="Skeletal muscle mass"
            shortLabel="SMM"
            unit="lbs"
            value={values.skeletalMuscleMassLbs}
            onChange={(value) => updateField('skeletalMuscleMassLbs', value)}
            disabled={disabled || isSubmitting}
            required
            placeholder="e.g. 91.7"
          />
          <NumberField
            id="percentBodyFat"
            label="Percent body fat"
            shortLabel="PBF"
            unit="%"
            value={values.percentBodyFat}
            onChange={(value) => updateField('percentBodyFat', value)}
            disabled={disabled || isSubmitting}
            required
            max={100}
            placeholder="e.g. 11.0"
          />
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left sm:pointer-events-none sm:cursor-default sm:rounded-none sm:border-0 sm:p-0"
          onClick={() => setAdditionalOpen((open) => !open)}
        >
          <div>
            <p className="text-sm font-medium">Additional metrics</p>
            <p className="text-muted-foreground mt-0.5 hidden text-xs sm:block">
              Optional values from the rest of the InBody printout.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:hidden">
            <Badge variant="secondary" className="text-[10px] font-normal">
              {OPTIONAL_METRIC_COUNT} optional
            </Badge>
            <ChevronDown
              className={cn(
                'text-muted-foreground size-4 transition-transform',
                additionalOpen && 'rotate-180'
              )}
            />
          </div>
        </button>
        <div
          className={cn(
            'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3',
            !additionalOpen && 'hidden sm:grid'
          )}
        >
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

      <div className="grid gap-1 sm:gap-2">
        <Label htmlFor="notes" className="text-[11px] uppercase tracking-wide sm:text-sm sm:normal-case sm:tracking-normal">
          Notes
        </Label>
        <Textarea
          id="notes"
          rows={2}
          value={values.notes ?? ''}
          onChange={(event) =>
            updateField('notes', event.target.value.trim() || null)
          }
          placeholder="Optional context about this scan — how you were feeling, time of day, hydration…"
          disabled={disabled || isSubmitting}
          className="min-h-0 text-sm sm:min-h-[5rem]"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
          className="w-full sm:w-auto"
          disabled={disabled || isSubmitting}
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
