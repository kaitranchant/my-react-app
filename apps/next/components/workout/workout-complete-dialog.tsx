'use client'

import * as React from 'react'
import { CheckCircle2, Flame, PartyPopper } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type WorkoutCompleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workoutName: string
  streak?: number
}

function ConfettiBurst() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        id: index,
        left: `${(index * 19) % 100}%`,
        delay: `${(index % 5) * 0.1}s`,
        color:
          index % 3 === 0
            ? 'bg-brand'
            : index % 3 === 1
              ? 'bg-status-warning'
              : 'bg-emerald-400',
      })),
    []
  )

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={cn(
            'animate-pr-confetti absolute top-0 size-2 rounded-full opacity-80',
            piece.color
          )}
          style={{ left: piece.left, animationDelay: piece.delay }}
        />
      ))}
    </div>
  )
}

export function WorkoutCompleteDialog({
  open,
  onOpenChange,
  workoutName,
  streak = 0,
}: WorkoutCompleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent visualViewport className="overflow-hidden p-0 sm:max-w-md">
        <div className="from-brand/10 via-status-success/10 relative bg-gradient-to-br to-emerald-500/10 px-6 pt-8 pb-6">
          <ConfettiBurst />
          <DialogHeader className="relative space-y-3 text-center">
            <div className="bg-background/80 text-brand mx-auto flex size-16 items-center justify-center rounded-2xl shadow-sm backdrop-blur">
              <PartyPopper className="size-8" />
            </div>
            <DialogTitle className="text-2xl">Workout complete!</DialogTitle>
            <DialogDescription className="text-base">
              You finished{' '}
              <span className="text-foreground font-medium">{workoutName}</span>
              . Nice work showing up today.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          {streak > 0 ? (
            <div className="bg-muted/40 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm">
              <Flame className="text-status-warning size-4" />
              <span>
                <span className="font-semibold">{streak}-day streak</span>
                <span className="text-muted-foreground"> — keep it going</span>
              </span>
            </div>
          ) : null}

          <Button
            type="button"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            <CheckCircle2 className="size-4" />
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
