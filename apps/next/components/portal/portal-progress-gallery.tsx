'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Camera, Loader2, Trash2, X } from 'lucide-react'
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
import { EmptyState } from '@/components/ui/empty-state'
import { formatCheckInDate } from '@/lib/check-ins'
import {
  groupPhotosByDate,
  PROGRESS_PHOTO_POSES,
  PROGRESS_PHOTO_POSE_LABELS,
} from '@/lib/progress-photos'
import type { ClientProgressPhotoWithUrl } from 'app/types/database'

type PortalProgressGalleryProps = {
  photos: ClientProgressPhotoWithUrl[]
  presentation?: 'default' | 'portal'
}

function MobileSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {children}
    </p>
  )
}

export function PortalProgressGallery({
  photos,
  presentation = 'default',
}: PortalProgressGalleryProps) {
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
    if (presentation === 'portal') {
      return (
        <section className="space-y-3">
          <MobileSectionLabel>Progress photos</MobileSectionLabel>
          <Card>
            <CardContent className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-2">
                {PROGRESS_PHOTO_POSES.map((pose) => (
                  <div
                    key={pose}
                    className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-3"
                  >
                    <Camera className="text-muted-foreground size-4" />
                    <span className="text-muted-foreground text-[11px] font-medium">
                      {PROGRESS_PHOTO_POSE_LABELS[pose]}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-center text-xs leading-relaxed">
                Photos are added when you submit a check-in
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/portal/check-in">
                  Submit a check-in to add photos
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress photos</CardTitle>
          <CardDescription>
            Upload front, side, and back photos when you submit a check-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Camera}
            title="No progress photos yet"
            description="Add front, side, and back photos when you submit your next check-in."
            action={{ label: 'Submit check-in', href: '/portal/check-in' }}
            className="py-4"
          />
        </CardContent>
      </Card>
    )
  }

  const gallery = (
    <>
      {presentation === 'portal' ? (
        <MobileSectionLabel>Progress photos</MobileSectionLabel>
      ) : null}
      <div className="grid gap-6">
        {groupedPhotos.map(({ date, photos: datePhotos }) => (
          <Card key={date}>
            <CardHeader className="pb-3">
              <CardTitle>{formatCheckInDate(date)}</CardTitle>
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
    </>
  )

  return (
    <>
      {presentation === 'portal' ? (
        <section className="space-y-3">{gallery}</section>
      ) : (
        gallery
      )}

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
