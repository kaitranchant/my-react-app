import { getExerciseDemoVideoUrl } from '@/lib/exercise-demo-video'
import { exerciseDbImageUrl } from '@/lib/exercise-catalog'
import type { Exercise } from 'app/types/database'

export type ExerciseMediaFields = Pick<
  Exercise,
  | 'external_id'
  | 'image_url'
  | 'demo_video_path'
  | 'instructions'
  | 'name'
  | 'muscle_group'
  | 'equipment'
>

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
    'external_id' | 'image_url' | 'demo_video_path' | 'instructions'
  >
): boolean {
  return Boolean(
    hasExerciseDemoVideo(exercise) ||
      getExerciseMediaUrl(exercise) ||
      exercise.instructions?.trim()
  )
}
