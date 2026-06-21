import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ClientFormReview,
  ClientFormReviewWithUrl,
} from 'app/types/database'

export const FORM_REVIEWS_BUCKET = 'form-reviews'
export const FORM_REVIEW_MAX_UPLOAD_BYTES = 50 * 1024 * 1024
export const FORM_REVIEW_SIGNED_URL_TTL_SECONDS = 3600

export const FORM_REVIEW_ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const

export type FormReviewMimeType = (typeof FORM_REVIEW_ALLOWED_MIME_TYPES)[number]

const MIME_TO_EXTENSION: Record<FormReviewMimeType, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
}

export function isFormReviewMimeType(value: string): value is FormReviewMimeType {
  return FORM_REVIEW_ALLOWED_MIME_TYPES.includes(value as FormReviewMimeType)
}

export function formReviewStoragePath(
  clientId: string,
  reviewId: string,
  contentType: string
) {
  const extension = isFormReviewMimeType(contentType)
    ? MIME_TO_EXTENSION[contentType]
    : '.mp4'
  return `clients/${clientId}/${reviewId}${extension}`
}

export function isFormReviewPending(
  review: Pick<ClientFormReview, 'reviewed_at'>
): boolean {
  return review.reviewed_at == null
}

export function formatFormReviewDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatFormReviewFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return 'Unknown size'
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function attachSignedUrlsToFormReviews(
  supabase: SupabaseClient,
  reviews: ClientFormReview[]
): Promise<ClientFormReviewWithUrl[]> {
  if (reviews.length === 0) {
    return []
  }

  const results = await Promise.all(
    reviews.map(async (review) => {
      const { data, error } = await supabase.storage
        .from(FORM_REVIEWS_BUCKET)
        .createSignedUrl(review.storage_path, FORM_REVIEW_SIGNED_URL_TTL_SECONDS)

      return {
        ...review,
        signedUrl: error ? null : (data?.signedUrl ?? null),
      }
    })
  )

  return results
}

export function getFormReviewTitle(
  review: Pick<ClientFormReview, 'title'> & {
    exercise?: { name: string } | null
  }
): string {
  if (review.title?.trim()) {
    return review.title.trim()
  }
  if (review.exercise?.name) {
    return review.exercise.name
  }
  return 'Form review'
}
