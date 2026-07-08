import { getExerciseDemoVideoUrl } from '@/lib/exercise-demo-video'
import { exerciseDbImageUrl } from '@/lib/exercise-catalog'
import type { Exercise } from 'app/types/database'

export type ExerciseMediaFields = Pick<
  Exercise,
  | 'external_id'
  | 'image_url'
  | 'demo_video_path'
  | 'demo_video_url'
  | 'instructions'
  | 'name'
  | 'muscle_group'
  | 'equipment'
>

export type ExerciseDemoLinkKind = 'youtube' | 'vimeo' | 'direct' | 'link'

export type ParsedExerciseDemoLink = {
  kind: ExerciseDemoLinkKind
  rawUrl: string
  /** URL suitable for <iframe src> when embeddable */
  embedUrl: string | null
  /** URL suitable for <video src> when it's a direct media file */
  videoSrc: string | null
}

const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|webm|ogg|mov|m4v)(?:$|[?#])/i

function normalizeHttpUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

function youtubeVideoId(
  hostname: string,
  pathname: string,
  searchParams: URLSearchParams
) {
  const host = hostname.replace(/^www\./, '').toLowerCase()

  if (host === 'youtu.be') {
    const id = pathname.split('/').filter(Boolean)[0]
    return id || null
  }

  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'music.youtube.com' ||
    host === 'youtube-nocookie.com'
  ) {
    if (pathname === '/watch') {
      return searchParams.get('v')
    }
    const embedMatch = pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)
    if (embedMatch?.[1]) return embedMatch[1]
  }

  return null
}

function vimeoVideoId(hostname: string, pathname: string) {
  const host = hostname.replace(/^www\./, '').toLowerCase()
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null

  const match = pathname.match(/\/(?:video\/)?(\d+)/)
  return match?.[1] ?? null
}

export function parseExerciseDemoVideoUrl(
  value: string | null | undefined
): ParsedExerciseDemoLink | null {
  const rawUrl = normalizeHttpUrl(value ?? '')
  if (!rawUrl) return null

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return null
  }

  const ytId = youtubeVideoId(
    parsed.hostname,
    parsed.pathname,
    parsed.searchParams
  )
  if (ytId) {
    return {
      kind: 'youtube',
      rawUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}`,
      videoSrc: null,
    }
  }

  const vimeoId = vimeoVideoId(parsed.hostname, parsed.pathname)
  if (vimeoId) {
    return {
      kind: 'vimeo',
      rawUrl,
      embedUrl: `https://player.vimeo.com/video/${encodeURIComponent(vimeoId)}`,
      videoSrc: null,
    }
  }

  if (DIRECT_VIDEO_EXTENSIONS.test(parsed.pathname)) {
    return {
      kind: 'direct',
      rawUrl,
      embedUrl: null,
      videoSrc: rawUrl,
    }
  }

  return {
    kind: 'link',
    rawUrl,
    embedUrl: null,
    videoSrc: null,
  }
}

export function getExerciseDemoVideoPublicUrl(
  exercise: Pick<Exercise, 'demo_video_path'>
): string | null {
  return getExerciseDemoVideoUrl(exercise.demo_video_path)
}

export function hasExerciseDemoVideo(
  exercise: Pick<Exercise, 'demo_video_path'>
): boolean {
  return Boolean(exercise.demo_video_path?.trim())
}

export function hasExerciseDemoVideoLink(
  exercise: Pick<Exercise, 'demo_video_url'>
): boolean {
  return Boolean(parseExerciseDemoVideoUrl(exercise.demo_video_url))
}

export function getExerciseMediaUrl(
  exercise: Pick<Exercise, 'external_id' | 'image_url'>
): string | null {
  if (exercise.image_url?.trim()) {
    return exercise.image_url.trim()
  }

  if (exercise.external_id?.trim()) {
    return exerciseDbImageUrl(exercise.external_id.trim())
  }

  return null
}

export function hasExerciseMedia(
  exercise: Pick<
    Exercise,
    | 'external_id'
    | 'image_url'
    | 'demo_video_path'
    | 'demo_video_url'
    | 'instructions'
  >
): boolean {
  return Boolean(
    hasExerciseDemoVideo(exercise) ||
      hasExerciseDemoVideoLink(exercise) ||
      getExerciseMediaUrl(exercise) ||
      exercise.instructions?.trim()
  )
}

export function exerciseDemoLinkLabel(kind: ExerciseDemoLinkKind) {
  switch (kind) {
    case 'youtube':
      return 'YouTube'
    case 'vimeo':
      return 'Vimeo'
    case 'direct':
      return 'Video file'
    default:
      return 'External video'
  }
}
