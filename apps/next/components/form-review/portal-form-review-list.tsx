'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { deleteClientFormReview } from '@/app/portal/form-review-actions'
import {
  FormReviewMedia,
  FormReviewMediaUnavailable,
} from '@/components/form-review/form-review-media'
import { FormReviewAnnotatedVideo } from '@/components/form-review/form-review-annotated-video'
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
import {
  formatFormReviewDate,
  formatFormReviewFileSize,
  getFormReviewTitle,
  isFormReviewImage,
  isFormReviewPending,
  parseCoachAnnotations,
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
          <CardTitle>Your submissions</CardTitle>
          <CardDescription>
            Uploaded photos, videos, and coach feedback will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Camera}
            title="No form reviews yet"
            description="Upload a photo or video of your lift above and your coach will leave feedback here."
            className="py-4"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Your submissions</h2>
        <p className="text-muted-foreground text-sm">
          {reviews.length} submission{reviews.length === 1 ? '' : 's'}
        </p>
      </div>

      {reviews.map((review) => {
        const pending = isFormReviewPending(review)
        const title = getFormReviewTitle(review)
        const annotations = parseCoachAnnotations(review.coach_annotations)
        const isVideo = !isFormReviewImage(review.content_type)

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
                isVideo ? (
                  <FormReviewAnnotatedVideo
                    signedUrl={review.signedUrl}
                    title={title}
                    annotations={annotations}
                    readOnly
                  />
                ) : (
                  <FormReviewMedia
                    signedUrl={review.signedUrl}
                    contentType={review.content_type}
                    title={title}
                  />
                )
              ) : (
                <FormReviewMediaUnavailable />
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
                  <p className="text-xs font-medium">Overall feedback</p>
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
