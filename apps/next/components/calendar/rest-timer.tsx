'use client'

import * as React from 'react'
import { Clock, Pause, Play, RotateCcw, Square, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatElapsedTime } from '@/lib/workout-log'
import { cn } from '@/lib/utils'

type RestTimerState = {
  exerciseName: string
  totalSeconds: number
  remainingSeconds: number
  paused: boolean
}

type RestTimerContextValue = {
  activeTimer: RestTimerState | null
  startRestTimer: (exerciseName: string, seconds: number) => void
  dismissRestTimer: () => void
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
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  const clearIntervalRef = React.useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const dismissRestTimer = React.useCallback(() => {
    clearIntervalRef()
    setActiveTimer(null)
  }, [clearIntervalRef])

  const startRestTimer = React.useCallback(
    (exerciseName: string, seconds: number) => {
      clearIntervalRef()
      setActiveTimer({
        exerciseName,
        totalSeconds: seconds,
        remainingSeconds: seconds,
        paused: false,
      })
    },
    [clearIntervalRef]
  )

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
  }, [activeTimer?.paused, activeTimer?.totalSeconds, clearIntervalRef])

  return (
    <RestTimerContext.Provider
      value={{ activeTimer, startRestTimer, dismissRestTimer }}
    >
      {children}
      {activeTimer && (
        <RestTimerOverlay
          timer={activeTimer}
          onPause={() =>
            setActiveTimer((current) =>
              current ? { ...current, paused: true } : current
            )
          }
          onResume={() =>
            setActiveTimer((current) =>
              current ? { ...current, paused: false } : current
            )
          }
          onReset={() =>
            setActiveTimer((current) =>
              current
                ? {
                    ...current,
                    remainingSeconds: current.totalSeconds,
                    paused: false,
                  }
                : current
            )
          }
          onAddTime={() =>
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
          }
          onDismiss={dismissRestTimer}
        />
      )}
    </RestTimerContext.Provider>
  )
}

function RestTimerOverlay({
  timer,
  onPause,
  onResume,
  onReset,
  onAddTime,
  onDismiss,
}: {
  timer: RestTimerState
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onAddTime: () => void
  onDismiss: () => void
}) {
  const progress =
    timer.totalSeconds > 0
      ? (timer.totalSeconds - timer.remainingSeconds) / timer.totalSeconds
      : 0
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 pb-6">
      <div
        className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
        role="dialog"
        aria-label="Rest timer"
      >
        <div className="bg-background/95 shadow-elevated overflow-hidden rounded-2xl border backdrop-blur-md">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Rest timer
              </p>
              <p className="truncate text-sm font-semibold">{timer.exerciseName}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={onDismiss}
              aria-label="Skip rest"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col items-center px-6 py-5">
            <div className="relative size-32">
              <svg
                className="size-full -rotate-90"
                viewBox="0 0 120 120"
                aria-hidden
              >
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-muted/40"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="text-brand transition-[stroke-dashoffset] duration-1000 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-brand text-4xl font-bold tabular-nums">
                  {timer.remainingSeconds}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatElapsedTime(timer.remainingSeconds)}
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 rounded-full"
                onClick={onReset}
                aria-label="Reset timer"
              >
                <RotateCcw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="size-12 rounded-full"
                onClick={timer.paused ? onResume : onPause}
                aria-label={timer.paused ? 'Resume timer' : 'Pause timer'}
              >
                {timer.paused ? (
                  <Play className="size-5" />
                ) : (
                  <Pause className="size-5" />
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 rounded-full"
                onClick={onDismiss}
                aria-label="Stop timer"
              >
                <Square className="size-4" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground mt-3 gap-1.5"
              onClick={onAddTime}
            >
              <Clock className="size-3.5" />
              +15 sec
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function RestTimerChip({
  seconds,
  onClick,
  className,
}: {
  seconds: number
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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
