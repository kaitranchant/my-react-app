'use client'

import * as React from 'react'
import { Clock, Pause, Play, RotateCcw, Square } from 'lucide-react'

import { WorkoutTimerOverlay } from '@/components/calendar/workout-timer-overlay'
import { formatElapsedTime } from '@/lib/workout-log'
import { cn } from '@/lib/utils'

type RestTimerState = {
  exerciseName: string
  totalSeconds: number
  /** Seconds left while paused; ignored while running (derived from endsAt). */
  remainingSeconds: number
  /** Absolute deadline in ms; null while paused. */
  endsAt: number | null
  paused: boolean
}

type RestTimerContextValue = {
  activeTimer: RestTimerState | null
  displayRemainingSeconds: number
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

function remainingFromEndsAt(endsAt: number | null, fallback: number) {
  if (endsAt == null) return fallback
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [activeTimer, setActiveTimer] = React.useState<RestTimerState | null>(
    null
  )
  const [overlayOpen, setOverlayOpen] = React.useState(false)
  const [nowMs, setNowMs] = React.useState(() => Date.now())
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
      const totalSeconds = Math.max(0, Math.round(seconds))
      setActiveTimer({
        exerciseName,
        totalSeconds,
        remainingSeconds: totalSeconds,
        endsAt: Date.now() + totalSeconds * 1000,
        paused: false,
      })
      setNowMs(Date.now())
    },
    [clearIntervalRef]
  )

  const pauseRestTimer = React.useCallback(() => {
    setActiveTimer((current) => {
      if (!current || current.paused) return current
      const remaining = remainingFromEndsAt(
        current.endsAt,
        current.remainingSeconds
      )
      return {
        ...current,
        remainingSeconds: remaining,
        endsAt: null,
        paused: true,
      }
    })
  }, [])

  const resumeRestTimer = React.useCallback(() => {
    setActiveTimer((current) => {
      if (!current || !current.paused) return current
      const remaining = Math.max(0, current.remainingSeconds)
      return {
        ...current,
        remainingSeconds: remaining,
        endsAt: Date.now() + remaining * 1000,
        paused: false,
      }
    })
    setNowMs(Date.now())
  }, [])

  const resetRestTimer = React.useCallback(() => {
    setActiveTimer((current) => {
      if (!current) return current
      return {
        ...current,
        remainingSeconds: current.totalSeconds,
        endsAt: Date.now() + current.totalSeconds * 1000,
        paused: false,
      }
    })
    setNowMs(Date.now())
  }, [])

  const addRestTime = React.useCallback(() => {
    setActiveTimer((current) => {
      if (!current) return current
      if (current.paused || current.endsAt == null) {
        const remaining = current.remainingSeconds + 15
        return {
          ...current,
          remainingSeconds: remaining,
          totalSeconds: Math.max(current.totalSeconds, remaining),
        }
      }
      const nextEndsAt = current.endsAt + 15_000
      const remaining = remainingFromEndsAt(nextEndsAt, current.remainingSeconds)
      return {
        ...current,
        endsAt: nextEndsAt,
        remainingSeconds: remaining,
        totalSeconds: Math.max(current.totalSeconds, remaining),
      }
    })
    setNowMs(Date.now())
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

  const syncFromWallClock = React.useCallback(() => {
    setNowMs(Date.now())
    setActiveTimer((current) => {
      if (!current || current.paused || current.endsAt == null) return current
      const remaining = remainingFromEndsAt(
        current.endsAt,
        current.remainingSeconds
      )
      if (remaining <= 0) {
        clearIntervalRef()
        setOverlayOpen(false)
        return null
      }
      if (remaining === current.remainingSeconds) return current
      return { ...current, remainingSeconds: remaining }
    })
  }, [clearIntervalRef])

  React.useEffect(() => {
    if (!activeTimer || activeTimer.paused) {
      clearIntervalRef()
      return
    }

    syncFromWallClock()
    intervalRef.current = setInterval(syncFromWallClock, 250)

    function onVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        syncFromWallClock()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)
    window.addEventListener('pageshow', onVisibilityOrFocus)

    return () => {
      clearIntervalRef()
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
      window.removeEventListener('pageshow', onVisibilityOrFocus)
    }
  }, [
    activeTimer?.paused,
    activeTimer?.endsAt,
    clearIntervalRef,
    syncFromWallClock,
  ])

  const displayRemainingSeconds = activeTimer
    ? activeTimer.paused || activeTimer.endsAt == null
      ? activeTimer.remainingSeconds
      : remainingFromEndsAt(activeTimer.endsAt, activeTimer.remainingSeconds)
    : 0

  // Keep displayRemainingSeconds reactive to nowMs ticks while running.
  void nowMs

  return (
    <RestTimerContext.Provider
      value={{
        activeTimer,
        displayRemainingSeconds,
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
          remainingSeconds={displayRemainingSeconds}
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
    displayRemainingSeconds,
    startRestTimer,
    dismissRestTimer,
    pauseRestTimer,
    resumeRestTimer,
    resetRestTimer,
    addRestTime,
    openRestTimerOverlay,
  } = useRestTimer()

  const isActive = activeTimer?.exerciseName === exerciseName

  if (!isActive || !activeTimer) {
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
      ? (activeTimer.totalSeconds - displayRemainingSeconds) /
        activeTimer.totalSeconds
      : 0

  return (
    <div
      className={cn(
        'bg-brand/10 text-brand relative inline-flex items-center gap-1 overflow-hidden rounded-full py-1 pr-1.5 pl-3 text-xs font-medium',
        className
      )}
      role="timer"
      aria-label={`Rest timer: ${formatElapsedTime(displayRemainingSeconds)} remaining`}
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
          {formatElapsedTime(displayRemainingSeconds)}
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
