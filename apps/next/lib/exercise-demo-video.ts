export const EXERCISE_DEMO_BUCKET = 'exercise-demos'
export const EXERCISE_DEMO_MAX_BYTES = 50 * 1024 * 1024

export const EXERCISE_DEMO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const

export type ExerciseDemoMimeType = (typeof EXERCISE_DEMO_MIME_TYPES)[number]

export const EXERCISE_DEMO_FILE_ACCEPT =
  'video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov'

export const EXERCISE_DEMO_UPLOAD_HINT =
  'MP4, WebM, or MOV · up to 50 MB. Clients see your video instead of the catalog GIF.'

const MIME_TO_EXTENSION: Record<ExerciseDemoMimeType, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
}

const EXTENSION_TO_MIME: Record<string, ExerciseDemoMimeType> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

export function isExerciseDemoMimeType(
  value: string
): value is ExerciseDemoMimeType {
  return EXERCISE_DEMO_MIME_TYPES.includes(value as ExerciseDemoMimeType)
}

export function resolveExerciseDemoContentType(
  file: Pick<File, 'name' | 'type'>
): ExerciseDemoMimeType | null {
  const normalizedType = file.type.trim()
  if (normalizedType && isExerciseDemoMimeType(normalizedType)) {
    return normalizedType
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension) return null

  return EXTENSION_TO_MIME[extension] ?? null
}

export function exerciseDemoStoragePath(
  coachId: string,
  exerciseId: string,
  contentType: string
) {
  const extension = isExerciseDemoMimeType(contentType)
    ? MIME_TO_EXTENSION[contentType]
    : '.mp4'
  return `${coachId}/${exerciseId}${extension}`
}

export function withExerciseDemoCacheBuster(
  url: string,
  version?: string | number
) {
  const v = version ?? Date.now()
  return url.includes('?') ? `${url}&v=${v}` : `${url}?v=${v}`
}

export function getExerciseDemoVideoUrl(
  demoVideoPath: string | null | undefined
): string | null {
  const path = demoVideoPath?.trim()
  if (!path) return null

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  if (!base) return null

  return `${base}/storage/v1/object/public/${EXERCISE_DEMO_BUCKET}/${path}`
}
