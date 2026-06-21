'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteClientFormReview } from '@/app/portal/form-review-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  formatFormReviewDate,
  formatFormReviewFileSize,
  getFormReviewTitle,
  isFormReviewPending,
} from '@/lib/form-reviews'
import type { ClientFormReviewWithUrl } from 'app/types/database'

type PortalFormReviewListProps = {
  reviews: Array<
    ClientFormReviewWithUrl & {
      exercise?: { id: string; name: string } | null
    }
  >
}

export function PortalFormReviewList({ reviews }: PortalFormReviewListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  async function handleDelete(reviewId: string) {
    setDeletingId(reviewId)
    const result = await deleteClientFormReview(reviewId)
    setDeletingId(null)

    if (result.success) {
      toast.success('Submission removed')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your submissions</CardTitle>
          <CardDescription>
            Uploaded videos and coach feedback will appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Your submissions</h2>
        <p className="text-muted-foreground text-sm">
          {reviews.length} video{reviews.length === 1 ? '' : 's'} submitted
        </p>
      </div>

      {reviews.map((review) => {
        const pending = isFormReviewPending(review)
        const title = getFormReviewTitle(review)

        return (
          <Card key={review.id}>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{title}</p>
                    <Badge variant={pending ? 'secondary' : 'default'}>
                      {pending ? 'Awaiting review' : 'Reviewed'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatFormReviewDate(review.created_at)} ·{' '}
                    {formatFormReviewFileSize(review.file_size_bytes)}
                  </p>
                </div>

                {pending ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === review.id}
                    onClick={() => void handleDelete(review.id)}
                  >
                    {deletingId === review.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    Remove
                  </Button>
                ) : null}
              </div>

              {review.signedUrl ? (
                <video
                  src={review.signedUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="bg-muted max-h-80 w-full rounded-lg border"
                />
              ) : (
                <div className="text-muted-foreground flex h-40 items-center justify-center rounded-lg border text-sm">
                  Video unavailable
                </div>
              )}

              {review.client_notes ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Your notes</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {review.client_notes}
                  </p>
                </div>
              ) : null}

              {review.coach_feedback ? (
                <div className="bg-muted/40 space-y-1 rounded-lg border p-3">
                  <p className="text-xs font-medium">Coach feedback</p>
                  <p className="text-sm leading-relaxed">{review.coach_feedback}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
