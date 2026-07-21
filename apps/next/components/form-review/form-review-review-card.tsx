'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Video } from 'lucide-react'
import { toast } from 'sonner'

import {
  deleteCoachFormReview,
  updateFormReviewFeedback,
} from '@/app/(dashboard)/form-review/actions'
import { ClientAvatar } from '@/components/clients/client-avatar'
import {
  FormReviewMedia,
  FormReviewMediaUnavailable,
} from '@/components/form-review/form-review-media'
import { FormReviewAnnotatedVideo } from '@/components/form-review/form-review-annotated-video'
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
import { Textarea } from '@/components/ui/textarea'
import {
  formatFormReviewDate,
  formatFormReviewFileSize,
  getFormReviewTitle,
  isFormReviewImage,
  isFormReviewPending,
  parseCoachAnnotations,
  sortFormReviewAnnotations,
} from '@/lib/form-reviews'
import type {
  ClientFormReviewWithClient,
  FormReviewAnnotation,
} from 'app/types/database'

type FormReviewReviewCardProps = {
  review: ClientFormReviewWithClient
  defaultExpanded?: boolean
}

export function FormReviewReviewCard({
  review,
  defaultExpanded = false,
}: FormReviewReviewCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const [feedback, setFeedback] = React.useState(review.coach_feedback ?? '')
  const [annotations, setAnnotations] = React.useState<FormReviewAnnotation[]>(() =>
    parseCoachAnnotations(review.coach_annotations)
  )
  const [pending, setPending] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    setFeedback(review.coach_feedback ?? '')
    setAnnotations(parseCoachAnnotations(review.coach_annotations))
  }, [review.coach_feedback, review.coach_annotations])

  async function handleSaveFeedback() {
    setPending(true)
    const result = await updateFormReviewFeedback(review.id, {
      coachFeedback: feedback.trim() || null,
      coachAnnotations: sortFormReviewAnnotations(annotations),
    })
    setPending(false)

    if (result.success) {
      toast.success('Feedback saved')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteCoachFormReview(review.id)
    setDeleting(false)

    if (result.success) {
      toast.success('Submission deleted')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  const title = getFormReviewTitle(review)
  const pendingReview = isFormReviewPending(review)
  const isVideo = !isFormReviewImage(review.content_type)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {review.client ? (
              <ClientAvatar
                name={review.client.full_name}
                avatarUrl={review.client.avatar_url}
                size="sm"
              />
            ) : null}
            <div className="space-y-1">
              {review.client ? (
                <Link
                  href={`/clients/${review.client.id}?tab=progress&section=form-reviews`}
                  className="hover:text-brand text-sm font-medium transition-colors"
                >
                  {review.client.full_name}
                </Link>
              ) : (
                <p className="text-sm font-medium">Unknown client</p>
              )}
              <CardTitle>{title}</CardTitle>
              <CardDescription>
                {formatFormReviewDate(review.created_at)} ·{' '}
                {formatFormReviewFileSize(review.file_size_bytes)}
                {review.scheduled_workout_id ? ' · From workout log' : ''}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={pendingReview ? 'secondary' : 'default'}>
              {pendingReview ? 'Pending' : 'Reviewed'}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? 'Hide' : 'Review'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded ? (
        <CardContent className="space-y-4 border-t pt-4">
          {review.signedUrl ? (
            isVideo ? (
              <FormReviewAnnotatedVideo
                signedUrl={review.signedUrl}
                title={title}
                annotations={annotations}
                onAnnotationsChange={setAnnotations}
                disabled={pending || deleting}
                videoClassName="max-h-[480px]"
              />
            ) : (
              <FormReviewMedia
                signedUrl={review.signedUrl}
                contentType={review.content_type}
                title={title}
                videoClassName="max-h-[480px]"
                imageClassName="max-h-[480px]"
              />
            )
          ) : (
            <FormReviewMediaUnavailable className="h-48" />
          )}

          {review.client_notes ? (
            <div className="space-y-1">
              <p className="text-xs font-medium">Client notes</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {review.client_notes}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-xs font-medium">Overall feedback</p>
            <Textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Share general cues, corrections, or encouragement…"
              rows={4}
              maxLength={2000}
              disabled={pending || deleting}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending || deleting}
              onClick={() => void handleSaveFeedback()}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save feedback'
              )}
            </Button>
            {review.canDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={pending || deleting}
                onClick={() => void handleDelete()}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
  )
}

type FormReviewFeedProps = {
  reviews: ClientFormReviewWithClient[]
  emptyMessage: string
}

export function FormReviewFeed({ reviews, emptyMessage }: FormReviewFeedProps) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Video}
            title={emptyMessage.replace(/\.$/, '')}
            description="Clients submit form videos from their portal. Share the link or message them to get started."
            action={{ label: 'View clients', href: '/clients' }}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review, index) => (
        <FormReviewReviewCard
          key={review.id}
          review={review}
          defaultExpanded={index === 0}
        />
      ))}
    </div>
  )
}

type ClientFormReviewsPanelProps = {
  clientName: string
  reviews: ClientFormReviewWithClient[]
}

export function ClientFormReviewsPanel({
  clientName,
  reviews,
}: ClientFormReviewsPanelProps) {
  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Form review</CardTitle>
          <CardDescription>
            {clientName} has not submitted any form photos or videos yet. Submissions
            here when uploaded from the client portal.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <FormReviewReviewCard key={review.id} review={review} defaultExpanded />
      ))}
    </div>
  )
}
