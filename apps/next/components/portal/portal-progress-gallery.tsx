'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { deleteClientProgressPhoto } from '@/app/portal/progress-photo-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatCheckInDate } from '@/lib/check-ins'
import {
  groupPhotosByDate,
  PROGRESS_PHOTO_POSE_LABELS,
} from '@/lib/progress-photos'
import type { ClientProgressPhotoWithUrl } from 'app/types/database'

type PortalProgressGalleryProps = {
  photos: ClientProgressPhotoWithUrl[]
}

export function PortalProgressGallery({ photos }: PortalProgressGalleryProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null)
  const groupedPhotos = groupPhotosByDate(photos)

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

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress photos</CardTitle>
          <CardDescription>
            Upload front, side, and back photos when you submit a check-in.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-6">
        {groupedPhotos.map(({ date, photos: datePhotos }) => (
          <Card key={date}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{formatCheckInDate(date)}</CardTitle>
              <CardDescription>
                {datePhotos.length} photo{datePhotos.length === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {datePhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-lg border"
                  >
                    {photo.signedUrl ? (
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() => setLightboxUrl(photo.signedUrl)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.signedUrl}
                          alt={`${PROGRESS_PHOTO_POSE_LABELS[photo.pose]} progress photo`}
                          className="aspect-[3/4] w-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="text-muted-foreground flex aspect-[3/4] items-center justify-center text-xs">
                        Unavailable
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary">
                        {PROGRESS_PHOTO_POSE_LABELS[photo.pose]}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 size-7 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100"
                      disabled={deletingId === photo.id}
                      onClick={() => void handleDelete(photo.id)}
                      aria-label="Remove photo"
                    >
                      {deletingId === photo.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                    {photo.caption && (
                      <p className="text-muted-foreground border-t px-3 py-2 text-xs leading-relaxed">
                        {photo.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
