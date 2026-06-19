'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteClientProgressPhoto,
  uploadClientProgressPhoto,
} from '@/app/portal/progress-photo-actions'
import { Button } from '@/components/ui/button'
import { processProgressPhotoImage } from '@/lib/progress-photo-client'
import {
  PROGRESS_PHOTO_POSES,
  PROGRESS_PHOTO_POSE_LABELS,
} from '@/lib/progress-photos'
import { cn } from '@/lib/utils'
import type {
  ClientProgressPhotoWithUrl,
  ProgressPhotoPose,
} from 'app/types/database'

type ProgressPhotoUploadProps = {
  checkInId: string | null
  photos: ClientProgressPhotoWithUrl[]
  variant: 'client' | 'coach'
  disabled?: boolean
}

export function ProgressPhotoUpload({
  checkInId,
  photos,
  variant,
  disabled = false,
}: ProgressPhotoUploadProps) {
  const router = useRouter()
  const [uploadingPose, setUploadingPose] = React.useState<ProgressPhotoPose | null>(
    null
  )
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null)
  const fileInputRefs = React.useRef<Record<ProgressPhotoPose, HTMLInputElement | null>>({
    front: null,
    side: null,
    back: null,
  })

  const photosByPose = React.useMemo(() => {
    const map = new Map<ProgressPhotoPose, ClientProgressPhotoWithUrl>()
    for (const photo of photos) {
      map.set(photo.pose, photo)
    }
    return map
  }, [photos])

  const canUpload = variant === 'client' && Boolean(checkInId) && !disabled

  async function handleFileChange(pose: ProgressPhotoPose, file: File | undefined) {
    if (!file || !checkInId || !canUpload) return

    try {
      setUploadingPose(pose)
      const processed = await processProgressPhotoImage(file)
      const formData = new FormData()
      formData.set('file', processed)

      const result = await uploadClientProgressPhoto(checkInId, pose, formData)
      setUploadingPose(null)

      if (result.success) {
        toast.success(`${PROGRESS_PHOTO_POSE_LABELS[pose]} photo uploaded`)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      setUploadingPose(null)
      toast.error(
        error instanceof Error ? error.message : 'Could not upload photo.'
      )
    }
  }

  async function handleDelete(photoId: string) {
    setDeletingId(photoId)
    const result = await deleteClientProgressPhoto(photoId)
    setDeletingId(null)

    if (result.success) {
      toast.success('Photo removed')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <div className="rounded-lg border border-dashed p-4">
        <div className="mb-4 space-y-1">
          <p className="text-sm font-medium">Progress photos</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {variant === 'client'
              ? checkInId
                ? 'Add front, side, and back photos for this check-in.'
                : 'Save your check-in first to attach progress photos.'
              : 'Photos uploaded by the client for this check-in.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {PROGRESS_PHOTO_POSES.map((pose) => {
            const photo = photosByPose.get(pose)
            const isUploading = uploadingPose === pose

            return (
              <div
                key={pose}
                className="bg-muted/20 flex flex-col gap-2 rounded-lg border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium">{PROGRESS_PHOTO_POSE_LABELS[pose]}</p>
                  {canUpload && (
                    <>
                      <input
                        ref={(node) => {
                          fileInputRefs.current[pose] = node
                        }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          void handleFileChange(pose, event.target.files?.[0])
                          event.target.value = ''
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={isUploading || Boolean(deletingId)}
                        onClick={() => fileInputRefs.current[pose]?.click()}
                      >
                        {isUploading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <>
                            <Camera className="size-3.5" />
                            {photo ? 'Replace' : 'Upload'}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>

                {photo?.signedUrl ? (
                  <div className="group relative overflow-hidden rounded-md border">
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() => setLightboxUrl(photo.signedUrl)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.signedUrl}
                        alt={`${PROGRESS_PHOTO_POSE_LABELS[pose]} progress photo`}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    </button>
                    {canUpload && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100"
                        disabled={deletingId === photo.id}
                        onClick={() => void handleDelete(photo.id)}
                      >
                        {deletingId === photo.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </Button>
                    )}
                    {photo.caption && (
                      <p className="text-muted-foreground border-t px-2 py-1.5 text-[11px] leading-relaxed">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground flex aspect-[3/4] items-center justify-center rounded-md border border-dashed text-xs">
                    No photo
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="size-4" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Progress photo preview"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

export function ProgressPhotoThumbnails({
  photos,
  className,
}: {
  photos: ClientProgressPhotoWithUrl[]
  className?: string
}) {
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null)
  const visiblePhotos = photos.filter((photo) => photo.signedUrl)

  if (visiblePhotos.length === 0) {
    return null
  }

  return (
    <>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {visiblePhotos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className="overflow-hidden rounded-md border"
            onClick={() => setLightboxUrl(photo.signedUrl)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.signedUrl!}
              alt={`${PROGRESS_PHOTO_POSE_LABELS[photo.pose]} progress photo`}
              className="size-14 object-cover"
            />
          </button>
        ))}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="size-4" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Progress photo preview"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
