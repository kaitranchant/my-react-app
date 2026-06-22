'use client'

import * as React from 'react'
import { MapPin, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  formatFormReviewTimestamp,
  sortFormReviewAnnotations,
} from '@/lib/form-reviews'
import { cn } from '@/lib/utils'
import type { FormReviewAnnotation } from 'app/types/database'

type FormReviewAnnotatedVideoProps = {
  signedUrl: string
  title: string
  annotations: FormReviewAnnotation[]
  onAnnotationsChange?: (annotations: FormReviewAnnotation[]) => void
  readOnly?: boolean
  disabled?: boolean
  className?: string
  videoClassName?: string
}

export function FormReviewAnnotatedVideo({
  signedUrl,
  title,
  annotations,
  onAnnotationsChange,
  readOnly = false,
  disabled = false,
  className,
  videoClassName,
}: FormReviewAnnotatedVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [markerText, setMarkerText] = React.useState('')
  const [activeAnnotationId, setActiveAnnotationId] = React.useState<string | null>(
    null
  )

  const sortedAnnotations = React.useMemo(
    () => sortFormReviewAnnotations(annotations),
    [annotations]
  )

  function seekTo(seconds: number, annotationId?: string) {
    const video = videoRef.current
    if (!video) return

    video.currentTime = seconds
    void video.play().catch(() => undefined)
    setActiveAnnotationId(annotationId ?? null)
  }

  function handleAddMarker() {
    const trimmed = markerText.trim()
    if (!trimmed || readOnly || !onAnnotationsChange) return

    const nextAnnotation: FormReviewAnnotation = {
      id: crypto.randomUUID(),
      timestampSeconds: currentTime,
      text: trimmed,
    }

    onAnnotationsChange(sortFormReviewAnnotations([...annotations, nextAnnotation]))
    setMarkerText('')
  }

  function handleRemoveMarker(annotationId: string) {
    if (readOnly || !onAnnotationsChange) return
    onAnnotationsChange(
      annotations.filter((annotation) => annotation.id !== annotationId)
    )
    if (activeAnnotationId === annotationId) {
      setActiveAnnotationId(null)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <video
        ref={videoRef}
        src={signedUrl}
        controls
        playsInline
        preload="metadata"
        className={cn(
          'bg-muted max-h-80 w-full rounded-lg border',
          videoClassName
        )}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0)
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime)
        }}
        aria-label={`${title} form review video`}
      />

      {duration > 0 && sortedAnnotations.length > 0 ? (
        <div className="relative h-2 rounded-full bg-muted">
          {sortedAnnotations.map((annotation) => {
            const position = Math.min(
              100,
              Math.max(0, (annotation.timestampSeconds / duration) * 100)
            )

            return (
              <button
                key={annotation.id}
                type="button"
                className={cn(
                  'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background bg-brand shadow-sm transition-transform hover:scale-125',
                  activeAnnotationId === annotation.id && 'scale-125 ring-2 ring-brand/40'
                )}
                style={{ left: `${position}%` }}
                title={`${formatFormReviewTimestamp(annotation.timestampSeconds)} — ${annotation.text}`}
                onClick={() => seekTo(annotation.timestampSeconds, annotation.id)}
              />
            )
          })}
        </div>
      ) : null}

      {!readOnly ? (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">Video markers</p>
            <p className="text-muted-foreground text-xs">
              Current time {formatFormReviewTimestamp(currentTime)}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={markerText}
              onChange={(event) => setMarkerText(event.target.value)}
              placeholder="Cue or correction at this moment…"
              maxLength={500}
              disabled={disabled}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddMarker()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={disabled || markerText.trim().length === 0}
              onClick={handleAddMarker}
            >
              <MapPin className="size-4" />
              Add at {formatFormReviewTimestamp(currentTime)}
            </Button>
          </div>
        </div>
      ) : null}

      {sortedAnnotations.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium">
            {readOnly ? 'Timestamped feedback' : 'Markers'}
          </p>
          <ul className="space-y-2">
            {sortedAnnotations.map((annotation) => (
              <li
                key={annotation.id}
                className={cn(
                  'flex items-start gap-2 rounded-lg border p-2',
                  activeAnnotationId === annotation.id && 'border-brand/40 bg-brand/5'
                )}
              >
                <button
                  type="button"
                  className="text-brand shrink-0 font-mono text-xs font-medium hover:underline"
                  onClick={() => seekTo(annotation.timestampSeconds, annotation.id)}
                >
                  {formatFormReviewTimestamp(annotation.timestampSeconds)}
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left text-sm leading-relaxed hover:underline"
                  onClick={() => seekTo(annotation.timestampSeconds, annotation.id)}
                >
                  {annotation.text}
                </button>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                    disabled={disabled}
                    onClick={() => handleRemoveMarker(annotation.id)}
                    aria-label={`Remove marker at ${formatFormReviewTimestamp(annotation.timestampSeconds)}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : readOnly ? null : (
        <p className="text-muted-foreground text-xs">
          Pause the video and add markers to call out specific moments in the lift.
        </p>
      )}
    </div>
  )
}
