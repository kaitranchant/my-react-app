'use client'

import * as React from 'react'

import {
  applyExerciseSetChanges,
  type PreviousSetLog,
  type WorkoutLogFieldFlags,
  type WorkoutLogSetDraft,
} from '@/lib/workout-log'
import {
  adjustKeypadWeight,
  appendKeypadDigitReplacingPredicted,
  backspaceKeypadValue,
  canNavigateSet,
  getAdjacentSetKeypadTarget,
  getCopyValuesForSet,
  getNextKeypadTarget,
  getWeightIncrement,
  shouldCompleteSetOnKeypadNext,
  shouldReplacePredictedFieldValue,
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
  goPreviousSet: () => void
  goNextSet: () => void
  canGoPreviousSet: boolean
  canGoNextSet: boolean
  getActiveValue: () => string
  getSetCount: (exerciseId: string) => number
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
  const replacePredictedRef = React.useRef(false)

  const getContext = React.useCallback((exerciseId: string) => {
    return exerciseContextsRef.current.get(exerciseId) ?? null
  }, [])

  const syncReplacePredictedForTarget = React.useCallback(
    (target: ActiveKeypadTarget) => {
      const context = getContext(target.exerciseId)
      const set = context?.sets.find((row) => row.setNumber === target.setNumber)
      const fieldValue = set?.[target.field] ?? ''
      replacePredictedRef.current = shouldReplacePredictedFieldValue(
        set,
        fieldValue
      )
    },
    [getContext]
  )

  const scrollCellIntoView = React.useCallback(
    (
      cellElement?: HTMLElement | null,
      behavior: ScrollBehavior = 'smooth'
    ) => {
      if (!cellElement) return
      const scrollParent = scrollContainerRef.current
      if (!scrollParent) {
        cellElement.scrollIntoView({ block: 'center', behavior })
        return
      }

      const padding = 24
      const parentRect = scrollParent.getBoundingClientRect()
      const rect = cellElement.getBoundingClientRect()
      const visualViewport = window.visualViewport
      const viewportBottom = visualViewport
        ? visualViewport.offsetTop + visualViewport.height
        : window.innerHeight
      // Use the known keypad height even while KeypadReserve is still animating,
      // so the active cell ends above the overlay rather than under it.
      const effectiveBottom =
        Math.min(parentRect.bottom, viewportBottom - keypadReserveHeight) -
        padding

      const overflowBottom = rect.bottom - effectiveBottom
      const overflowTop = parentRect.top + padding - rect.top

      let delta = 0
      if (overflowBottom > 0) {
        delta = overflowBottom
      } else if (overflowTop > 0) {
        delta = -overflowTop
      }

      if (Math.abs(delta) < 2) return

      scrollParent.scrollTo({
        top: scrollParent.scrollTop + delta,
        behavior,
      })
    },
    [keypadReserveHeight, scrollContainerRef]
  )

  const scrollToField = React.useCallback(
    (target: ActiveKeypadTarget, behavior: ScrollBehavior = 'smooth') => {
      requestAnimationFrame(() => {
        const selector = `[data-workout-log-field="${target.exerciseId}:${target.setNumber}:${target.field}"]`
        const element = scrollContainerRef.current?.querySelector(selector)
        if (element instanceof HTMLElement) {
          scrollCellIntoView(element, behavior)
        }
      })
    },
    [scrollCellIntoView, scrollContainerRef]
  )

  const activeTargetRef = React.useRef(activeTarget)
  activeTargetRef.current = activeTarget
  const previousReserveHeightRef = React.useRef(0)

  // Slide once when the keypad first opens. Field-to-field moves are handled by
  // openField / goNext so we don't restart the animation.
  React.useEffect(() => {
    const previousHeight = previousReserveHeightRef.current
    previousReserveHeightRef.current = keypadReserveHeight

    const target = activeTargetRef.current
    const justOpened = previousHeight <= 0 && keypadReserveHeight > 0
    if (!enabled || !target || !justOpened) return

    const frame = requestAnimationFrame(() => {
      scrollToField(target, 'smooth')
    })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [enabled, keypadReserveHeight, scrollToField])

  const openField = React.useCallback(
    (target: ActiveKeypadTarget, cellElement?: HTMLElement | null) => {
      if (!enabled) return
      const context = getContext(target.exerciseId)
      const set = context?.sets.find((row) => row.setNumber === target.setNumber)
      syncReplacePredictedForTarget(target)
      setEditingValue(set?.[target.field] ?? '')
      setActiveTarget(target)
      setPlateSheetOpen(false)
      // When the keypad is already open (e.g. tapping another box), slide now.
      // First open waits for keypadReserveHeight so we only animate once.
      if (keypadReserveHeight > 0) {
        if (cellElement) {
          requestAnimationFrame(() => scrollCellIntoView(cellElement, 'smooth'))
        } else {
          scrollToField(target, 'smooth')
        }
      }
    },
    [
      enabled,
      getContext,
      keypadReserveHeight,
      scrollCellIntoView,
      scrollToField,
      syncReplacePredictedForTarget,
    ]
  )

  const closeKeypad = React.useCallback(() => {
    replacePredictedRef.current = false
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
      const result = appendKeypadDigitReplacingPredicted(
        getActiveValue(),
        digit,
        activeTarget.field,
        replacePredictedRef.current
      )
      replacePredictedRef.current = result.replacePredicted
      patchActiveField(result.value)
    },
    [activeTarget, getActiveValue, patchActiveField]
  )

  const backspace = React.useCallback(() => {
    if (replacePredictedRef.current) {
      replacePredictedRef.current = false
      patchActiveField('')
      return
    }
    patchActiveField(backspaceKeypadValue(getActiveValue()))
  }, [getActiveValue, patchActiveField])

  const adjustWeight = React.useCallback(
    (delta: number) => {
      if (!activeTarget || activeTarget.field !== 'weight') return
      replacePredictedRef.current = false
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
      replacePredictedRef.current = false
    }
  }, [activeTarget, getContext])

  const goNext = React.useCallback(() => {
    if (!activeTarget) return
    const context = getContext(activeTarget.exerciseId)
    if (!context) return

    let sets = context.sets
    const currentSet = sets.find((row) => row.setNumber === activeTarget.setNumber)
    const currentSetWithEdits = currentSet
      ? { ...currentSet, [activeTarget.field]: editingValue }
      : undefined

    const next = getNextKeypadTarget(
      activeTarget,
      sets,
      context.fields
    )

    if (
      shouldCompleteSetOnKeypadNext(
        activeTarget,
        next,
        currentSetWithEdits,
        context.fields
      )
    ) {
      sets = applyExerciseSetChanges(
        sets,
        activeTarget.setNumber,
        { completed: true },
        context.fields
      )
      context.onSetChange(activeTarget.setNumber, { completed: true })
    }

    if (next) {
      syncReplacePredictedForTarget(next)
      const set = sets.find((row) => row.setNumber === next.setNumber)
      setEditingValue(set?.[next.field] ?? '')
      setActiveTarget(next)
      scrollToField(next)
      return
    }

    closeKeypad()
  }, [
    activeTarget,
    closeKeypad,
    editingValue,
    getContext,
    scrollToField,
  ])

  const navigateToTarget = React.useCallback(
    (next: ActiveKeypadTarget) => {
      syncReplacePredictedForTarget(next)
      const nextContext = getContext(next.exerciseId)
      const set = nextContext?.sets.find((row) => row.setNumber === next.setNumber)
      setEditingValue(set?.[next.field] ?? '')
      setActiveTarget(next)
      scrollToField(next)
    },
    [getContext, scrollToField, syncReplacePredictedForTarget]
  )

  const canGoPreviousSet = React.useMemo(() => {
    if (!activeTarget) return false
    const context = getContext(activeTarget.exerciseId)
    if (!context) return false
    return canNavigateSet(activeTarget, context.sets, 'up')
  }, [activeTarget, getContext])

  const canGoNextSet = React.useMemo(() => {
    if (!activeTarget) return false
    const context = getContext(activeTarget.exerciseId)
    if (!context) return false
    return canNavigateSet(activeTarget, context.sets, 'down')
  }, [activeTarget, getContext])

  const goPreviousSet = React.useCallback(() => {
    if (!activeTarget) return
    const context = getContext(activeTarget.exerciseId)
    if (!context) return

    const previous = getAdjacentSetKeypadTarget(
      activeTarget,
      context.sets,
      'up'
    )
    if (previous) navigateToTarget(previous)
  }, [activeTarget, getContext, navigateToTarget])

  const goNextSet = React.useCallback(() => {
    if (!activeTarget) return
    const context = getContext(activeTarget.exerciseId)
    if (!context) return

    const next = getAdjacentSetKeypadTarget(
      activeTarget,
      context.sets,
      'down'
    )
    if (next) navigateToTarget(next)
  }, [activeTarget, getContext, navigateToTarget])

  const getSetCount = React.useCallback((exerciseId: string) => {
    return getContext(exerciseId)?.sets.length ?? 0
  }, [getContext])

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
      goPreviousSet,
      goNextSet,
      canGoPreviousSet,
      canGoNextSet,
      getActiveValue,
      getSetCount,
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
      goPreviousSet,
      goNextSet,
      canGoPreviousSet,
      canGoNextSet,
      getActiveValue,
      getSetCount,
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
