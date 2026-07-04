'use client'

import * as React from 'react'
import { Clock, Pause, Play, RotateCcw, Square } from 'lucide-react'

import { WorkoutTimerOverlay } from '@/components/calendar/workout-timer-overlay'
import { formatElapsedTime } from '@/lib/workout-log'
import { cn } from '@/lib/utils'

type RestTimerState = {
  exerciseName: string
  totalSeconds: number
  remainingSeconds: number
  paused: boolean
  startedAt: number
}

type RestTimerContextValue = {
  activeTimer: RestTimerState | null
  startRestTimer: (exerciseName: string, seconds: number) => void
  dismissRestTimer: () => void
  pauseRestTimer: () => void
  resumeRestTimer: () => void
  resetRestTimer: () => void
  addRestTime: () => void
  openRestTimerOverlay: () => void
  closeRestTimerOverlay: () => void
}

const RestTimerContext = React.createContext<RestTimerContextValue | null>(null)

export function useRestTimer() {
  const ctx = React.useContext(RestTimerContext)
  if (!ctx) {
    throw new Error('useRestTimer must be used within RestTimerProvider')
  }
  return ctx
}

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTimer, setActiveTimer] = React.useState<RestTimerState | null>(
    null
  )
  const [overlayOpen, setOverlayOpen] = React.useState(false)
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const clearIntervalRef = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const dismissRestTimer = React.useCallback(() => {
    clearIntervalRef()
    setOverlayOpen(false)
    setActiveTimer(null)
  }, [clearIntervalRef])

  const startRestTimer = React.useCallback(
    (exerciseName: string, seconds: number) => {
      clearIntervalRef()
      setOverlayOpen(false)
      setActiveTimer({
        exerciseName,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        paused: false,
        startedAt: Date.now(),
      })
    },
    [clearIntervalRef]
  )

  const pauseRestTimer = React.useCallback(() => {
    setActiveTimer((current) =>
      current ? { ...current, paused: true } : current
    )
  }, [])

  const resumeRestTimer = React.useCallback(() => {
    setActiveTimer((current) =>
      current ? { ...current, paused: false } : current
    )
  }, [])

  const resetRestTimer = React.useCallback(() => {
    setActiveTimer((current) =>
      current
        ? {
            ...current,
            remainingSeconds: current.totalSeconds,
            paused: false,
          }
        : current
    )
  }, [])

  const addRestTime = React.useCallback(() => {
    setActiveTimer((current) =>
      current
        ? {
            ...current,
            remainingSeconds: current.remainingSeconds + 15,
            totalSeconds: Math.max(
              current.totalSeconds,
              current.remainingSeconds + 15
            ),
          }
        : current
    )
  }, [])

  const openRestTimerOverlay = React.useCallback(() => {
    setOverlayOpen(true)
  }, [])

  const closeRestTimerOverlay = React.useCallback(() => {
    setOverlayOpen(false)
  }, [])

  React.useEffect(() => {
    if (!activeTimer) {
      setOverlayOpen(false)
    }
  }, [activeTimer])

  React.useEffect(() => {
    if (!activeTimer || activeTimer.paused) {
      clearIntervalRef()
      return
    }

    intervalRef.current = setInterval(() => {
      setActiveTimer((current) => {
        if (!current || current.paused) return current

        const next = current.remainingSeconds - 1
        if (next <= 0) {
          clearIntervalRef()
          return null
        }

        return { ...current, remainingSeconds: next }
      })
    }, 1000)

    return clearIntervalRef
  }, [activeTimer?.paused, activeTimer?.startedAt, clearIntervalRef])

  return (
    <RestTimerContext.Provider
      value={{
        activeTimer,
        startRestTimer,
        dismissRestTimer,
        pauseRestTimer,
        resumeRestTimer,
        resetRestTimer,
        addRestTime,
        openRestTimerOverlay,
        closeRestTimerOverlay,
      }}
    >
      {children}
      {activeTimer ? (
        <WorkoutTimerOverlay
          open={overlayOpen}
          onMinimize={closeRestTimerOverlay}
          title={activeTimer.exerciseName}
          remainingSeconds={activeTimer.remainingSeconds}
          totalSeconds={activeTimer.totalSeconds}
          paused={activeTimer.paused}
          variant="rest"
          onPause={pauseRestTimer}
          onResume={resumeRestTimer}
          onReset={resetRestTimer}
          onDismiss={dismissRestTimer}
          onAddTime={addRestTime}
          dismissLabel="Skip rest"
        />
      ) : null}
    </RestTimerContext.Provider>
  )
}

function RestTimerControlButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="text-brand hover:bg-brand/15 inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors"
    >
      {children}
    </button>
  )
}

export function RestTimerChip({
  exerciseName,
  seconds,
  className,
}: {
  exerciseName: string
  seconds: number
  className?: string
}) {
  const {
    activeTimer,
    startRestTimer,
    dismissRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    resetRestTimer,
    addRestTime,
    openRestTimerOverlay,
  } = useRestTimer()

  const isActive = activeTimer?.exerciseName === exerciseName

  if (!isActive) {
    return (
      <button
        type="button"
        onClick={() => startRestTimer(exerciseName, seconds)}
        className={cn(
          'bg-brand/10 text-brand hover:bg-brand/15 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          className
        )}
      >
        <Clock className="size-3.5" />
        Rest {formatElapsedTime(seconds)}
      </button>
    )
  }

  const progress =
    activeTimer.totalSeconds > 0
      ? (activeTimer.totalSeconds - activeTimer.remainingSeconds) /
        activeTimer.totalSeconds
      : 0

  return (
    <div
      className={cn(
        'bg-brand/10 text-brand relative inline-flex items-center gap-1 overflow-hidden rounded-full py-1 pr-1.5 pl-3 text-xs font-medium',
        className
      )}
      role="timer"
      aria-label={`Rest timer: ${formatElapsedTime(activeTimer.remainingSeconds)} remaining`}
    >
      <div
        className="bg-brand/15 absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear"
        style={{ width: `${progress * 100}%` }}
        aria-hidden
      />
      <button
        type="button"
        onClick={openRestTimerOverlay}
        className="relative inline-flex min-w-0 items-center gap-1 rounded-full pr-1 transition-colors hover:bg-brand/10"
        aria-label="Expand rest timer"
      >
        <Clock className="size-3.5 shrink-0" />
        <span className="min-w-[2.75rem] tabular-nums font-semibold">
          {formatElapsedTime(activeTimer.remainingSeconds)}
        </span>
      </button>
      <div className="relative flex items-center">
        <RestTimerControlButton
          label={activeTimer.paused ? 'Resume timer' : 'Pause timer'}
          onClick={activeTimer.paused ? resumeRestTimer : pauseRestTimer}
        >
          {activeTimer.paused ? (
            <Play className="size-3" />
          ) : (
            <Pause className="size-3" />
          )}
        </RestTimerControlButton>
        <RestTimerControlButton label="Reset timer" onClick={resetRestTimer}>
          <RotateCcw className="size-3" />
        </RestTimerControlButton>
        <RestTimerControlButton label="Skip rest" onClick={dismissRestTimer}>
          <Square className="size-3" />
        </RestTimerControlButton>
        <button
          type="button"
          onClick={addRestTime}
          className="text-brand/80 hover:bg-brand/15 ml-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
        >
          +15s
        </button>
      </div>
    </div>
  )
}
