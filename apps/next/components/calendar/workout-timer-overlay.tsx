'use client'

import { ChevronDown, Clock, Pause, Play, RotateCcw, Square } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatElapsedTime } from '@/lib/workout-log'

export type WorkoutTimerOverlayVariant = 'rest' | 'duration'

const variantStyles: Record<
  WorkoutTimerOverlayVariant,
  { ring: string; label: string }
> = {
  rest: {
    ring: 'text-brand',
    label: 'Rest timer',
  },
  duration: {
    ring: 'text-chart-2',
    label: 'Set timer',
  },
}

type WorkoutTimerOverlayProps = {
  open: boolean
  onMinimize: () => void
  title: string
  remainingSeconds: number
  totalSeconds: number
  paused: boolean
  variant: WorkoutTimerOverlayVariant
  onPause: () => void
  onResume: () => void
  onReset: () => void
  onDismiss: () => void
  onAddTime?: () => void
  dismissLabel?: string
}

export function WorkoutTimerOverlay({
  open,
  onMinimize,
  title,
  remainingSeconds,
  totalSeconds,
  paused,
  variant,
  onPause,
  onResume,
  onReset,
  onDismiss,
  onAddTime,
  dismissLabel = 'Stop timer',
}: WorkoutTimerOverlayProps) {
  if (!open) return null

  const progress =
    totalSeconds > 0
      ? (totalSeconds - remainingSeconds) / totalSeconds
      : 0
  const circumference = 2 * Math.PI * 54
  const strokeDashoffset = circumference * (1 - progress)
  const styles = variantStyles[variant]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4 pb-6">
      <div
        className="pointer-events-auto w-full max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
        role="dialog"
        aria-label={styles.label}
      >
        <div className="bg-background/95 shadow-elevated overflow-hidden rounded-2xl border backdrop-blur-md">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {styles.label}
              </p>
              <p className="truncate text-sm font-semibold">{title}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={onMinimize}
              aria-label="Minimize timer"
            >
              <ChevronDown className="size-4" />
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
                  className={`${styles.ring} transition-[stroke-dashoffset] duration-1000 ease-linear`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`text-4xl font-bold tabular-nums ${styles.ring}`}
                >
                  {remainingSeconds}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatElapsedTime(remainingSeconds)}
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
                onClick={paused ? onResume : onPause}
                aria-label={paused ? 'Resume timer' : 'Pause timer'}
              >
                {paused ? (
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
                aria-label={dismissLabel}
              >
                <Square className="size-4" />
              </Button>
            </div>

            {onAddTime ? (
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
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
