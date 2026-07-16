'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ExerciseDemoLinkPlayer } from '@/components/exercises/exercise-demo-link-player'
import {
  getExerciseDemoVideoPublicUrl,
  getExerciseMediaUrl,
  hasExerciseDemoVideo,
  hasExerciseDemoVideoLink,
  type ExerciseMediaFields,
} from '@/lib/exercise-media'

type ExerciseMediaDialogProps = {
  exercise: ExerciseMediaFields
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExerciseMediaDialog({
  exercise,
  open,
  onOpenChange,
}: ExerciseMediaDialogProps) {
  const uploadedVideoUrl = getExerciseDemoVideoPublicUrl(exercise)
  const hasLink = hasExerciseDemoVideoLink(exercise)
  const imageUrl =
    hasExerciseDemoVideo(exercise) || hasLink
      ? null
      : getExerciseMediaUrl(exercise)
  const instructions = exercise.instructions?.trim()
  const subtitle = [exercise.muscle_group, exercise.equipment]
    .filter(Boolean)
    .join(' · ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{exercise.name}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {uploadedVideoUrl ? (
            <div className="bg-muted overflow-hidden rounded-lg">
              <video
                src={uploadedVideoUrl}
                controls
                playsInline
                preload="metadata"
                className="mx-auto max-h-[min(50vh,360px)] w-full object-contain"
              />
            </div>
          ) : hasLink ? (
            <ExerciseDemoLinkPlayer
              url={exercise.demo_video_url}
              title={exercise.name}
            />
          ) : imageUrl ? (
            <div className="bg-muted overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${exercise.name} demonstration`}
                className="mx-auto max-h-[min(50vh,360px)] w-full object-contain"
              />
            </div>
          ) : null}

          {instructions ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Instructions</p>
              <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {instructions}
              </p>
            </div>
          ) : !uploadedVideoUrl && !hasLink && !imageUrl ? (
            <p className="text-muted-foreground text-sm">
              No demonstration media is available for this exercise.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
