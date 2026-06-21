import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ClientFormReview,
  ClientFormReviewWithUrl,
} from 'app/types/database'

export const FORM_REVIEWS_BUCKET = 'form-reviews'
export const FORM_REVIEW_MAX_VIDEO_BYTES = 50 * 1024 * 1024
export const FORM_REVIEW_MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const FORM_REVIEW_SIGNED_URL_TTL_SECONDS = 3600

export const FORM_REVIEW_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const

export const FORM_REVIEW_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const FORM_REVIEW_ALLOWED_MIME_TYPES = [
  ...FORM_REVIEW_VIDEO_MIME_TYPES,
  ...FORM_REVIEW_IMAGE_MIME_TYPES,
] as const

export type FormReviewMimeType = (typeof FORM_REVIEW_ALLOWED_MIME_TYPES)[number]

export const FORM_REVIEW_FILE_ACCEPT =
  'video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/webp,.mp4,.webm,.mov,.jpg,.jpeg,.png,.webp'

export const FORM_REVIEW_UPLOAD_HINT =
  'Video (MP4, WebM, MOV up to 50 MB) or photo (JPEG, PNG, WebP up to 10 MB).'

const MIME_TO_EXTENSION: Record<FormReviewMimeType, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const EXTENSION_TO_MIME: Record<string, FormReviewMimeType> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function isFormReviewMimeType(value: string): value is FormReviewMimeType {
  return FORM_REVIEW_ALLOWED_MIME_TYPES.includes(value as FormReviewMimeType)
}

export function normalizeFormReviewMimeType(value: string): string {
  if (value === 'image/jpg') return 'image/jpeg'
  return value
}

export function resolveFormReviewContentType(file: Pick<File, 'name' | 'type'>): FormReviewMimeType | null {
  const normalizedType = normalizeFormReviewMimeType(file.type.trim())
  if (normalizedType && isFormReviewMimeType(normalizedType)) {
    return normalizedType
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension) return null

  return EXTENSION_TO_MIME[extension] ?? null
}

export function isFormReviewImage(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export function getFormReviewMaxUploadBytes(contentType: string): number {
  return isFormReviewImage(contentType)
    ? FORM_REVIEW_MAX_IMAGE_BYTES
    : FORM_REVIEW_MAX_VIDEO_BYTES
}

export function formReviewStoragePath(
  clientId: string,
  reviewId: string,
  contentType: string
) {
  const normalizedType = normalizeFormReviewMimeType(contentType)
  const extension = isFormReviewMimeType(normalizedType)
    ? MIME_TO_EXTENSION[normalizedType]
    : '.bin'
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
