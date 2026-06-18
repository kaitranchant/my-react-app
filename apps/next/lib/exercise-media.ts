import { exerciseDbImageUrl } from '@/lib/exercisedb'
import type { Exercise } from 'app/types/database'

export type ExerciseMediaFields = Pick<
  Exercise,
  'external_id' | 'image_url' | 'instructions' | 'name' | 'muscle_group' | 'equipment'
>

export function getExerciseMediaUrl(
  exercise: Pick<Exercise, 'external_id' | 'image_url'>,
  resolution = '360'
): string | null {
  if (exercise.image_url?.trim()) {
    return exercise.image_url.trim()
  }

  if (exercise.external_id?.trim()) {
    return exerciseDbImageUrl(exercise.external_id.trim(), resolution)
  }

  return null
}

export function hasExerciseMedia(
  exercise: Pick<Exercise, 'external_id' | 'image_url' | 'instructions'>
): boolean {
  return Boolean(getExerciseMediaUrl(exercise) || exercise.instructions?.trim())
}
