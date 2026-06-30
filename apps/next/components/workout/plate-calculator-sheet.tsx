'use client'

import * as React from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { weightUnitLabel } from '@/lib/coach-preferences'
import {
  calculatePlatesPerSide,
  formatPlateStack,
  getDefaultBarWeight,
  getStandardPlates,
} from '@/lib/workout-log-keypad'

import { useWorkoutLogKeypad } from './workout-log-keypad-context'

export function PlateCalculatorSheet() {
  const keypad = useWorkoutLogKeypad()

  if (!keypad) return null

  const { plateSheetOpen, closePlateSheet, weightUnit, getActiveValue } = keypad
  const unitLabel = weightUnitLabel(weightUnit)
  const parsedWeight = Number.parseFloat(getActiveValue())
  const totalWeight = Number.isFinite(parsedWeight) ? parsedWeight : 0
  const barWeight = getDefaultBarWeight(weightUnit)
  const plates = getStandardPlates(weightUnit)
  const result = calculatePlatesPerSide(totalWeight, barWeight, plates)

  return (
    <Sheet
      open={plateSheetOpen}
      onOpenChange={(open) => {
        if (!open) closePlateSheet()
      }}
    >
      <SheetContent side="bottom" className="gap-0 pb-[env(safe-area-inset-bottom)]">
        <SheetHeader className="text-left">
          <SheetTitle>Plate calculator</SheetTitle>
          <SheetDescription>
            Per-side stack for {totalWeight > 0 ? `${totalWeight} ${unitLabel}` : 'current weight'} with a {barWeight} {unitLabel} bar.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
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
            Available plates: {plates.map((plate) => `${plate} ${unitLabel}`).join(', ')}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
