'use client'

import * as React from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'

import { getExerciseRecord } from '@/app/(dashboard)/library/exercises/actions'
import { ExerciseDemoVideoUpload } from '@/components/exercises/exercise-demo-video-upload'
import { ExerciseFormDialog } from '@/components/exercises/exercise-form-dialog'
import { ExerciseSourceBadge } from '@/components/exercises/exercise-source-badge'
import { ExerciseStatusBadge } from '@/components/exercises/exercise-status-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { exerciseDbImageUrl } from '@/lib/exercise-catalog'
import {
  getExerciseDemoVideoPublicUrl,
  getExerciseMediaUrl,
  hasExerciseDemoVideo,
} from '@/lib/exercise-media'
import type { Exercise } from 'app/types/database'

type ExerciseDetailDialogProps = {
  exerciseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatLabel(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function DetailField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value?.trim()) return null

  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}

export function ExerciseDetailDialog({
  exerciseId,
  open,
  onOpenChange,
}: ExerciseDetailDialogProps) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [exercise, setExercise] = React.useState<Exercise | null>(null)

  React.useEffect(() => {
    if (!open || !exerciseId) {
      setExercise(null)
      return
    }

    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await getExerciseRecord(exerciseId)
      if (cancelled) return
      setLoading(false)

      if (!result.success) {
        toast.error(result.error)
        onOpenChange(false)
        return
      }

      setExercise(result.exercise)
    })()

    return () => {
      cancelled = true
    }
  }, [open, exerciseId, onOpenChange])

  if (!exerciseId) return null

  const demoVideoUrl = exercise ? getExerciseDemoVideoPublicUrl(exercise) : null
  const imageUrl =
    exercise && !hasExerciseDemoVideo(exercise)
      ? getExerciseMediaUrl(exercise)
      : null
  const secondImageUrl =
    exercise?.external_id
      ? exerciseDbImageUrl(exercise.external_id).replace('/0.jpg', '/1.jpg')
      : null
  const instructions = exercise?.instructions?.trim()
  const subtitle = exercise
    ? [exercise.muscle_group, exercise.equipment].filter(Boolean).join(' · ')
    : ''

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
              <div className="min-w-0 space-y-2">
                {loading || !exercise ? (
                  <DialogTitle className="text-left">Loading exercise…</DialogTitle>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle className="text-left">{exercise.name}</DialogTitle>
                      <ExerciseSourceBadge source={exercise.source} />
                      <ExerciseStatusBadge status={exercise.status} />
                    </div>
                    {subtitle ? (
                      <DialogDescription className="text-left">
                        {subtitle}
                      </DialogDescription>
                    ) : null}
                  </>
                )}
              </div>
              {exercise ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {loading || !exercise ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading exercise details…
              </div>
            ) : (
              <>
                {demoVideoUrl ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Demo video</p>
                    <div className="bg-muted overflow-hidden rounded-lg">
                      <video
                        src={demoVideoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="mx-auto max-h-[min(45vh,320px)] w-full object-contain"
                      />
                    </div>
                  </div>
                ) : imageUrl ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Demonstration</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={`${exercise.name} start position`}
                        className="bg-muted aspect-[4/3] w-full rounded-lg object-cover"
                      />
                      {secondImageUrl && exercise.external_id ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={secondImageUrl}
                          alt={`${exercise.name} end position`}
                          className="bg-muted aspect-[4/3] w-full rounded-lg object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <DetailField label="Muscle group" value={exercise.muscle_group} />
                  <DetailField label="Equipment" value={exercise.equipment} />
                  <DetailField
                    label="Category"
                    value={exercise.category ? formatLabel(exercise.category) : null}
                  />
                  <DetailField
                    label="Difficulty"
                    value={
                      exercise.difficulty ? formatLabel(exercise.difficulty) : null
                    }
                  />
                  <DetailField
                    label="Updated"
                    value={formatDate(exercise.updated_at)}
                  />
                </div>

                {instructions ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Instructions</p>
                    <div className="bg-muted/30 rounded-lg border px-4 py-3">
                      <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                        {instructions}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No instructions are stored for this exercise.
                  </p>
                )}

                <div className="space-y-2 border-t pt-5">
                  <p className="text-sm font-medium">Coach demo video</p>
                  <p className="text-muted-foreground text-xs">
                    Upload your own demonstration clip for this exercise.
                  </p>
                  <ExerciseDemoVideoUpload
                    exerciseId={exercise.id}
                    demoVideoPath={exercise.demo_video_path}
                  />
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {exercise ? (
        <ExerciseFormDialog
          exercise={exercise}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  )
}
