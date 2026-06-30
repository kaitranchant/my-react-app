'use client'

import * as React from 'react'

import type { PreviousSetLog, WorkoutLogFieldFlags, WorkoutLogSetDraft } from '@/lib/workout-log'
import {
  adjustKeypadWeight,
  appendKeypadDigit,
  backspaceKeypadValue,
  getCopyValuesForSet,
  getNextKeypadTarget,
  getWeightIncrement,
  type ActiveKeypadTarget,
  type WorkoutLogKeypadField,
} from '@/lib/workout-log-keypad'
import type { WeightUnit } from 'app/types/database'

export type KeypadExerciseContext = {
  sets: WorkoutLogSetDraft[]
  fields: WorkoutLogFieldFlags
  previousSets: Record<number, PreviousSetLog>
  onSetChange: (setNumber: number, patch: Partial<WorkoutLogSetDraft>) => void
}

type WorkoutLogKeypadContextValue = {
  enabled: boolean
  weightUnit: WeightUnit
  activeTarget: ActiveKeypadTarget | null
  plateSheetOpen: boolean
  openField: (target: ActiveKeypadTarget, cellElement?: HTMLElement | null) => void
  closeKeypad: () => void
  openPlateSheet: () => void
  closePlateSheet: () => void
  isFieldActive: (
    exerciseId: string,
    setNumber: number,
    field: WorkoutLogKeypadField
  ) => boolean
  registerExerciseContext: (
    exerciseId: string,
    context: KeypadExerciseContext
  ) => void
  unregisterExerciseContext: (exerciseId: string) => void
  appendDigit: (digit: string) => void
  backspace: () => void
  adjustWeight: (delta: number) => void
  copyPrevious: () => void
  goNext: () => void
  getActiveValue: () => string
  keypadReserveHeight: number
  setKeypadReserveHeight: (height: number) => void
}

const WorkoutLogKeypadContext =
  React.createContext<WorkoutLogKeypadContextValue | null>(null)

export function useWorkoutLogKeypad() {
  return React.useContext(WorkoutLogKeypadContext)
}

type WorkoutLogKeypadProviderProps = {
  enabled: boolean
  weightUnit: WeightUnit
  scrollContainerRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
}

export function WorkoutLogKeypadProvider({
  enabled,
  weightUnit,
  scrollContainerRef,
  children,
}: WorkoutLogKeypadProviderProps) {
  const [activeTarget, setActiveTarget] =
    React.useState<ActiveKeypadTarget | null>(null)
  const [editingValue, setEditingValue] = React.useState('')
  const [plateSheetOpen, setPlateSheetOpen] = React.useState(false)
  const [keypadReserveHeight, setKeypadReserveHeight] = React.useState(0)
  const exerciseContextsRef = React.useRef(
    new Map<string, KeypadExerciseContext>()
  )

  const getContext = React.useCallback((exerciseId: string) => {
    return exerciseContextsRef.current.get(exerciseId) ?? null
  }, [])

  const scrollCellIntoView = React.useCallback(
    (cellElement?: HTMLElement | null) => {
      if (!cellElement) return
      const scrollParent = scrollContainerRef.current
      if (!scrollParent) {
        cellElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        return
      }

      const parentRect = scrollParent.getBoundingClientRect()
      const rect = cellElement.getBoundingClientRect()
      const padding = 16
      const overflowBottom = rect.bottom - (parentRect.bottom - padding)
      const overflowTop = parentRect.top + padding - rect.top

      if (overflowBottom > 0) {
        scrollParent.scrollTop += overflowBottom
      } else if (overflowTop > 0) {
        scrollParent.scrollTop -= overflowTop
      }
    },
    [scrollContainerRef]
  )

  const scrollToField = React.useCallback(
    (target: ActiveKeypadTarget) => {
      requestAnimationFrame(() => {
        const selector = `[data-workout-log-field="${target.exerciseId}:${target.setNumber}:${target.field}"]`
        const element = scrollContainerRef.current?.querySelector(selector)
        if (element instanceof HTMLElement) {
          scrollCellIntoView(element)
        }
      })
    },
    [scrollCellIntoView, scrollContainerRef]
  )

  const openField = React.useCallback(
    (target: ActiveKeypadTarget, cellElement?: HTMLElement | null) => {
      if (!enabled) return
      const context = getContext(target.exerciseId)
      const set = context?.sets.find((row) => row.setNumber === target.setNumber)
      setEditingValue(set?.[target.field] ?? '')
      setActiveTarget(target)
      setPlateSheetOpen(false)
      if (cellElement) {
        requestAnimationFrame(() => scrollCellIntoView(cellElement))
      } else {
        scrollToField(target)
      }
    },
    [enabled, getContext, scrollCellIntoView, scrollToField]
  )

  const closeKeypad = React.useCallback(() => {
    setActiveTarget(null)
    setPlateSheetOpen(false)
  }, [])

  const openPlateSheet = React.useCallback(() => {
    if (!enabled || !activeTarget) return
    setPlateSheetOpen(true)
  }, [activeTarget, enabled])

  const closePlateSheet = React.useCallback(() => {
    setPlateSheetOpen(false)
  }, [])

  const isFieldActive = React.useCallback(
    (exerciseId: string, setNumber: number, field: WorkoutLogKeypadField) => {
      if (!activeTarget) return false
      return (
        activeTarget.exerciseId === exerciseId &&
        activeTarget.setNumber === setNumber &&
        activeTarget.field === field
      )
    },
    [activeTarget]
  )

  const registerExerciseContext = React.useCallback(
    (exerciseId: string, context: KeypadExerciseContext) => {
      exerciseContextsRef.current.set(exerciseId, context)
    },
    []
  )

  const unregisterExerciseContext = React.useCallback((exerciseId: string) => {
    exerciseContextsRef.current.delete(exerciseId)
  }, [])

  const getActiveValue = React.useCallback(() => {
    return editingValue
  }, [editingValue])

  const patchActiveField = React.useCallback(
    (value: string) => {
      if (!activeTarget) return
      const context = getContext(activeTarget.exerciseId)
      if (!context) return
      setEditingValue(value)
      context.onSetChange(activeTarget.setNumber, {
        [activeTarget.field]: value,
      })
    },
    [activeTarget, getContext]
  )

  const appendDigit = React.useCallback(
    (digit: string) => {
      if (!activeTarget) return
      const current = getActiveValue()
      patchActiveField(
        appendKeypadDigit(current, digit, activeTarget.field)
      )
    },
    [activeTarget, getActiveValue, patchActiveField]
  )

  const backspace = React.useCallback(() => {
    patchActiveField(backspaceKeypadValue(getActiveValue()))
  }, [getActiveValue, patchActiveField])

  const adjustWeight = React.useCallback(
    (delta: number) => {
      if (!activeTarget || activeTarget.field !== 'weight') return
      patchActiveField(
        adjustKeypadWeight(getActiveValue(), delta, weightUnit)
      )
    },
    [activeTarget, getActiveValue, patchActiveField, weightUnit]
  )

  const copyPrevious = React.useCallback(() => {
    if (!activeTarget) return
    const context = getContext(activeTarget.exerciseId)
    if (!context) return

    const patch = getCopyValuesForSet(
      activeTarget.setNumber,
      context.sets,
      context.previousSets,
      context.fields
    )

    if (Object.keys(patch).length > 0) {
      context.onSetChange(activeTarget.setNumber, patch)
      if (activeTarget.field in patch) {
        setEditingValue(String(patch[activeTarget.field as keyof typeof patch] ?? ''))
      }
    }
  }, [activeTarget, getContext])

  const goNext = React.useCallback(() => {
    if (!activeTarget) return
    const context = getContext(activeTarget.exerciseId)
    if (!context) return

    const next = getNextKeypadTarget(
      activeTarget,
      context.sets,
      context.fields
    )

    if (next) {
      const nextContext = getContext(next.exerciseId)
      const set = nextContext?.sets.find((row) => row.setNumber === next.setNumber)
      setEditingValue(set?.[next.field] ?? '')
      setActiveTarget(next)
      scrollToField(next)
      return
    }

    closeKeypad()
  }, [activeTarget, closeKeypad, getContext, scrollToField])

  const value = React.useMemo<WorkoutLogKeypadContextValue>(
    () => ({
      enabled,
      weightUnit,
      activeTarget,
      plateSheetOpen,
      openField,
      closeKeypad,
      openPlateSheet,
      closePlateSheet,
      isFieldActive,
      registerExerciseContext,
      unregisterExerciseContext,
      appendDigit,
      backspace,
      adjustWeight,
      copyPrevious,
      goNext,
      getActiveValue,
      keypadReserveHeight,
      setKeypadReserveHeight,
    }),
    [
      enabled,
      weightUnit,
      activeTarget,
      plateSheetOpen,
      openField,
      closeKeypad,
      openPlateSheet,
      closePlateSheet,
      isFieldActive,
      registerExerciseContext,
      unregisterExerciseContext,
      appendDigit,
      backspace,
      adjustWeight,
      copyPrevious,
      goNext,
      getActiveValue,
      keypadReserveHeight,
    ]
  )

  return (
    <WorkoutLogKeypadContext.Provider value={value}>
      {children}
    </WorkoutLogKeypadContext.Provider>
  )
}

export function getWeightStepLabel(unit: WeightUnit, sign: '+' | '-'): string {
  const step = getWeightIncrement(unit)
  return `${sign}${step}`
}
