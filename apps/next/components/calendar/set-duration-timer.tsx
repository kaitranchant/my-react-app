'use client'

import * as React from 'react'
import { Clock, Pause, Play, RotateCcw, Square } from 'lucide-react'

import { WorkoutTimerOverlay } from '@/components/calendar/workout-timer-overlay'
import { formatElapsedTime } from '@/lib/workout-log'
import { cn } from '@/lib/utils'

type SetDurationTimerState = {
  totalSeconds: number
  remainingSeconds: number
  endsAt: number | null
  paused: boolean
}

function remainingFromEndsAt(endsAt: number | null, fallback: number) {
  if (endsAt == null) return fallback
  return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
}

function TimerControlButton({
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
      className="text-chart-2 hover:bg-chart-2/15 inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors"
    >
      {children}
    </button>
  )
}

export function SetDurationTimerChip({
  seconds,
  disabled = false,
  onComplete,
  className,
}: {
  seconds: number
  disabled?: boolean
  onComplete?: (seconds: number) => void
  className?: string
}) {
  const [state, setState] = React.useState<SetDurationTimerState | null>(null)
  const [overlayOpen, setOverlayOpen] = React.useState(false)
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const onCompleteRef = React.useRef(onComplete)

  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  React.useEffect(() => {
    setState(null)
    setOverlayOpen(false)
  }, [seconds])

  const syncFromWallClock = React.useCallback(() => {
    setNowMs(Date.now())
    setState((current) => {
      if (!current || current.paused || current.endsAt == null) return current
      const remaining = remainingFromEndsAt(
        current.endsAt,
        current.remainingSeconds
      )
      if (remaining <= 0) {
        onCompleteRef.current?.(current.totalSeconds)
        setOverlayOpen(false)
        return null
      }
      if (remaining === current.remainingSeconds) return current
      return { ...current, remainingSeconds: remaining }
    })
  }, [])

  React.useEffect(() => {
    if (!state || state.paused) return

    syncFromWallClock()
    const interval = window.setInterval(syncFromWallClock, 250)

    function onVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        syncFromWallClock()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)
    window.addEventListener('pageshow', onVisibilityOrFocus)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
      window.removeEventListener('pageshow', onVisibilityOrFocus)
    }
  }, [state?.paused, state?.endsAt, syncFromWallClock])

  const pauseTimer = React.useCallback(() => {
    setState((current) => {
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

  const resumeTimer = React.useCallback(() => {
    setState((current) => {
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

  const resetTimer = React.useCallback(() => {
    setState({
      totalSeconds: seconds,
      remainingSeconds: seconds,
      endsAt: Date.now() + seconds * 1000,
      paused: false,
    })
    setNowMs(Date.now())
  }, [seconds])

  const stopTimer = React.useCallback(() => {
    setOverlayOpen(false)
    setState(null)
  }, [])

  if (disabled || seconds <= 0) {
    return null
  }

  if (!state) {
    return (
      <button
        type="button"
        onClick={() => {
          setState({
            totalSeconds: seconds,
            remainingSeconds: seconds,
            endsAt: Date.now() + seconds * 1000,
            paused: false,
          })
          setNowMs(Date.now())
        }}
        className={cn(
          'bg-chart-2/10 text-chart-2 hover:bg-chart-2/15 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          className
        )}
      >
        <Clock className="size-3.5" />
        Timer {formatElapsedTime(seconds)}
      </button>
    )
  }

  const displayRemaining =
    state.paused || state.endsAt == null
      ? state.remainingSeconds
      : remainingFromEndsAt(state.endsAt, state.remainingSeconds)
  void nowMs

  const progress =
    state.totalSeconds > 0
      ? (state.totalSeconds - displayRemaining) / state.totalSeconds
      : 0

  return (
    <>
      <div
        className={cn(
          'bg-chart-2/10 text-chart-2 relative inline-flex items-center gap-1 overflow-hidden rounded-full py-1 pr-1.5 pl-3 text-xs font-medium',
          className
        )}
        role="timer"
        aria-label={`Set timer: ${formatElapsedTime(displayRemaining)} remaining`}
      >
        <div
          className="bg-chart-2/15 absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear"
          style={{ width: `${progress * 100}%` }}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => setOverlayOpen(true)}
          className="relative inline-flex min-w-0 items-center gap-1 rounded-full pr-1 transition-colors hover:bg-chart-2/10"
          aria-label="Expand set timer"
        >
          <Clock className="size-3.5 shrink-0" />
          <span className="min-w-[2.75rem] tabular-nums font-semibold">
            {formatElapsedTime(displayRemaining)}
          </span>
        </button>
        <div className="relative flex items-center">
          <TimerControlButton
            label={state.paused ? 'Resume timer' : 'Pause timer'}
            onClick={state.paused ? resumeTimer : pauseTimer}
          >
            {state.paused ? <Play className="size-3" /> : <Pause className="size-3" />}
          </TimerControlButton>
          <TimerControlButton label="Reset timer" onClick={resetTimer}>
            <RotateCcw className="size-3" />
          </TimerControlButton>
          <TimerControlButton label="Stop timer" onClick={stopTimer}>
            <Square className="size-3" />
          </TimerControlButton>
        </div>
      </div>

      <WorkoutTimerOverlay
        open={overlayOpen}
        onMinimize={() => setOverlayOpen(false)}
        title={`${formatElapsedTime(seconds)} hold`}
        remainingSeconds={displayRemaining}
        totalSeconds={state.totalSeconds}
        paused={state.paused}
        variant="duration"
        onPause={pauseTimer}
        onResume={resumeTimer}
        onReset={resetTimer}
        onDismiss={stopTimer}
        dismissLabel="Stop timer"
      />
    </>
  )
}
