'use client'

import * as React from 'react'
import { Share2, Sparkles, Trophy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { weightUnitLabel } from '@/lib/coach-preferences'
import {
  buildPrCelebrationHeadline,
  buildPrShareText,
  formatPrAchievementLabel,
} from '@/lib/pr-celebration'
import type { NewPrSummary } from '@/lib/pr-records'
import type { WeightUnit } from 'app/types/database'
import { cn } from '@/lib/utils'

type PrCelebrationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  prs: NewPrSummary[]
  workoutName: string
  athleteName?: string
  weightUnit?: WeightUnit
}

function ConfettiBurst() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        id: index,
        left: `${(index * 17) % 100}%`,
        delay: `${(index % 6) * 0.12}s`,
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

export function PrCelebrationDialog({
  open,
  onOpenChange,
  prs,
  workoutName,
  athleteName,
  weightUnit = 'lbs',
}: PrCelebrationDialogProps) {
  const shareCardRef = React.useRef<HTMLDivElement>(null)
  const shareText = React.useMemo(
    () =>
      buildPrShareText({
        prs,
        workoutName,
        athleteName,
        weightUnit,
      }),
    [prs, workoutName, athleteName, weightUnit]
  )

  async function handleShare() {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: buildPrCelebrationHeadline(prs.length),
          text: shareText,
        })
        return
      }

      await navigator.clipboard.writeText(shareText)
      toast.success('Achievement copied to clipboard')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      toast.error('Could not share your achievement')
    }
  }

  if (prs.length === 0) {
    return null
  }

  const headline = buildPrCelebrationHeadline(prs.length)
  const primaryPr = prs[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="from-brand/10 via-status-warning/10 relative bg-gradient-to-br to-emerald-500/10 px-6 pt-8 pb-6">
          <ConfettiBurst />
          <DialogHeader className="relative space-y-3 text-center">
            <div className="bg-background/80 text-brand mx-auto flex size-16 items-center justify-center rounded-2xl shadow-sm backdrop-blur">
              <Trophy className="size-8" />
            </div>
            <DialogTitle className="text-2xl">{headline}</DialogTitle>
            <DialogDescription className="text-base">
              {athleteName ? `${athleteName} crushed it on ` : 'You crushed '}
              <span className="text-foreground font-medium">{workoutName}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div
            ref={shareCardRef}
            className="border-brand/20 from-brand/8 rounded-2xl border bg-gradient-to-br to-emerald-500/10 p-5 text-center shadow-sm"
          >
            <div className="text-brand mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="size-3.5" />
              Personal best
            </div>
            <p className="text-lg font-semibold">
              {primaryPr.exerciseName}
            </p>
            <p className="text-brand mt-1 text-3xl font-bold tracking-tight">
              {formatPrAchievementLabel(primaryPr, weightUnit)}
            </p>
            {prs.length > 1 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                +{prs.length - 1} more PR{prs.length - 1 === 1 ? '' : 's'} today
              </p>
            ) : null}
            <p className="text-muted-foreground mt-4 text-xs">
              {weightUnitLabel(weightUnit)} · {workoutName}
            </p>
          </div>

          {prs.length > 1 ? (
            <ul className="space-y-2">
              {prs.slice(1).map((pr) => (
                <li
                  key={`${pr.exerciseId}-${pr.recordType}-${pr.e1rm ?? pr.weight}`}
                  className="bg-muted/40 flex items-center justify-between rounded-xl px-3 py-2 text-sm"
                >
                  <span className="font-medium">{pr.exerciseName}</span>
                  <span className="text-brand font-semibold">
                    {formatPrAchievementLabel(pr, weightUnit)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={() => void handleShare()}>
              <Share2 className="size-4" />
              Share
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Keep going
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
