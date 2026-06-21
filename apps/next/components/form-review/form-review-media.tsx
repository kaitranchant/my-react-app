'use client'

import { isFormReviewImage } from '@/lib/form-reviews'
import { cn } from '@/lib/utils'

type FormReviewMediaProps = {
  signedUrl: string
  contentType: string
  title: string
  className?: string
  imageClassName?: string
  videoClassName?: string
}

export function FormReviewMedia({
  signedUrl,
  contentType,
  title,
  className,
  imageClassName,
  videoClassName,
}: FormReviewMediaProps) {
  if (isFormReviewImage(contentType)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={signedUrl}
        alt={`${title} form review`}
        className={cn(
          'bg-muted max-h-80 w-full rounded-lg border object-contain',
          className,
          imageClassName
        )}
      />
    )
  }

  return (
    <video
      src={signedUrl}
      controls
      playsInline
      preload="metadata"
      className={cn(
        'bg-muted max-h-80 w-full rounded-lg border',
        className,
        videoClassName
      )}
    />
  )
}

export function FormReviewMediaUnavailable({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex h-40 items-center justify-center rounded-lg border text-sm',
        className
      )}
    >
      Media unavailable
    </div>
  )
}
