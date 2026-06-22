'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Camera, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { deleteCoachProgressPhoto } from '@/app/(dashboard)/progress-photos/actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
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

type ClientProgressPhotosPanelProps = {
  clientId: string
  clientName: string
  photos: ClientProgressPhotoWithUrl[]
}

export function ClientProgressPhotosPanel({
  clientId,
  clientName,
  photos,
}: ClientProgressPhotosPanelProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null)
  const groupedPhotos = groupPhotosByDate(photos)

  async function handleDelete(photoId: string) {
    setDeletingId(photoId)
    const result = await deleteCoachProgressPhoto(photoId)
    setDeletingId(null)

    if (result.success) {
      toast.success('Photo deleted')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Camera}
            title="No progress photos yet"
            description={`Photos uploaded during check-ins will appear here. Ask ${clientName} to add photos on their next check-in.`}
            action={{
              label: 'View check-ins',
              href: `/clients/${clientId}?tab=progress&section=check-ins`,
            }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
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

type ProgressPhotosFeedProps = {
  photos: Array<
    ClientProgressPhotoWithUrl & {
      client: { id: string; full_name: string; avatar_url: string | null } | null
    }
  >
}

export function ProgressPhotosFeed({ photos }: ProgressPhotosFeedProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = React.useState<string | null>(null)

  async function handleDelete(photoId: string) {
    setDeletingId(photoId)
    const result = await deleteCoachProgressPhoto(photoId)
    setDeletingId(null)

    if (result.success) {
      toast.success('Photo deleted')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Camera}
            title="No progress photos yet"
            description="Photos uploaded during client check-ins will appear here."
            action={{ label: 'View check-ins', href: '/check-ins' }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {photos.map((photo) => (
          <Card key={photo.id}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
              {photo.signedUrl ? (
                <button
                  type="button"
                  className="shrink-0 overflow-hidden rounded-lg border"
                  onClick={() => setLightboxUrl(photo.signedUrl)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.signedUrl}
                    alt={`${PROGRESS_PHOTO_POSE_LABELS[photo.pose]} progress photo`}
                    className="size-28 object-cover sm:size-32"
                  />
                </button>
              ) : (
                <div className="text-muted-foreground flex size-28 shrink-0 items-center justify-center rounded-lg border text-xs sm:size-32">
                  Unavailable
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {photo.client && (
                      <ClientAvatar
                        name={photo.client.full_name}
                        avatarUrl={photo.client.avatar_url}
                        size="sm"
                      />
                    )}
                    <div className="space-y-1">
                      {photo.client ? (
                        <Link
                          href={`/clients/${photo.client.id}?tab=progress&section=progress-photos`}
                          className="hover:text-brand text-sm font-medium transition-colors"
                        >
                          {photo.client.full_name}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">Unknown client</p>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {formatCheckInDate(photo.photo_date)} ·{' '}
                        {PROGRESS_PHOTO_POSE_LABELS[photo.pose]}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === photo.id}
                    onClick={() => void handleDelete(photo.id)}
                  >
                    {deletingId === photo.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
                {photo.caption && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {photo.caption}
                  </p>
                )}
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
