import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  ClientProgressPhoto,
  ClientProgressPhotoWithUrl,
  ProgressPhotoPose,
} from 'app/types/database'

export const PROGRESS_PHOTOS_BUCKET = 'progress-photos'
export const PROGRESS_PHOTO_MAX_UPLOAD_BYTES = 2 * 1024 * 1024
export const PROGRESS_PHOTO_SIGNED_URL_TTL_SECONDS = 3600

export const PROGRESS_PHOTO_POSES: ProgressPhotoPose[] = ['front', 'side', 'back']

export const PROGRESS_PHOTO_POSE_LABELS: Record<ProgressPhotoPose, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
}

export function progressPhotoStoragePath(clientId: string, photoId: string) {
  return `clients/${clientId}/${photoId}.webp`
}

export function isProgressPhotoPose(value: string): value is ProgressPhotoPose {
  return PROGRESS_PHOTO_POSES.includes(value as ProgressPhotoPose)
}

export async function attachSignedUrlsToPhotos(
  supabase: SupabaseClient,
  photos: ClientProgressPhoto[]
): Promise<ClientProgressPhotoWithUrl[]> {
  if (photos.length === 0) {
    return []
  }

  const results = await Promise.all(
    photos.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from(PROGRESS_PHOTOS_BUCKET)
        .createSignedUrl(photo.storage_path, PROGRESS_PHOTO_SIGNED_URL_TTL_SECONDS)

      return {
        ...photo,
        signedUrl: error ? null : (data?.signedUrl ?? null),
      }
    })
  )

  return results
}

export function groupPhotosByDate(
  photos: ClientProgressPhotoWithUrl[]
): { date: string; photos: ClientProgressPhotoWithUrl[] }[] {
  const groups = new Map<string, ClientProgressPhotoWithUrl[]>()

  for (const photo of photos) {
    const existing = groups.get(photo.photo_date) ?? []
    existing.push(photo)
    groups.set(photo.photo_date, existing)
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, groupedPhotos]) => ({
      date,
      photos: groupedPhotos.sort((left, right) =>
        PROGRESS_PHOTO_POSES.indexOf(left.pose) -
        PROGRESS_PHOTO_POSES.indexOf(right.pose)
      ),
    }))
}

export function countPhotosByCheckInId(
  photos: Pick<ClientProgressPhoto, 'check_in_id'>[]
): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const photo of photos) {
    if (!photo.check_in_id) continue
    counts[photo.check_in_id] = (counts[photo.check_in_id] ?? 0) + 1
  }

  return counts
}
