'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'

import { weightUnitLabel } from '@/lib/coach-preferences'
import {
  calculatePlatesPerSide,
  formatPlateStack,
  getDefaultBarWeight,
  getStandardPlates,
} from '@/lib/workout-log-keypad'

import { useWorkoutLogKeypad } from './workout-log-keypad-context'

type PlateCalculatorPanelProps = {
  onClose?: () => void
}

export function PlateCalculatorPanel({ onClose }: PlateCalculatorPanelProps) {
  const keypad = useWorkoutLogKeypad()

  if (!keypad) return null

  const { weightUnit, getActiveValue } = keypad
  const unitLabel = weightUnitLabel(weightUnit)
  const parsedWeight = Number.parseFloat(getActiveValue())
  const totalWeight = Number.isFinite(parsedWeight) ? parsedWeight : 0
  const barWeight = getDefaultBarWeight(weightUnit)
  const plates = getStandardPlates(weightUnit)
  const result = calculatePlatesPerSide(totalWeight, barWeight, plates)

  return (
    <div className="flex flex-col gap-3 px-4 pt-3 pb-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <h3 className="text-foreground text-base font-semibold">
            Plate calculator
          </h3>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Per-side stack for{' '}
            {totalWeight > 0 ? `${totalWeight} ${unitLabel}` : 'current weight'}{' '}
            with a {barWeight} {unitLabel} bar.
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Close plate calculator"
            onClick={onClose}
            className="ring-offset-background focus:ring-ring text-muted-foreground hover:text-foreground shrink-0 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="bg-muted/40 rounded-xl border p-4">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Each side
        </p>
        <p className="mt-1 text-lg font-semibold">
          {formatPlateStack(result.platesPerSide, weightUnit)}
        </p>
      </div>

      {!result.achievable && totalWeight > 0 ? (
        <p className="text-destructive text-sm">
          {result.remainderPerSide > 0
            ? `Cannot load exactly — ${result.remainderPerSide} ${unitLabel} remainder per side.`
            : 'Total weight is below bar weight.'}
        </p>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Available plates:{' '}
        {plates.map((plate) => `${plate} ${unitLabel}`).join(', ')}
      </p>
    </div>
  )
}
