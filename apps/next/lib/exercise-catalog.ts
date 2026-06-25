/** Raw record from yuhonas/free-exercise-db */
export type FreeExerciseRecord = {
  id: string
  name: string
  force?: string
  level?: string
  mechanic?: string
  equipment?: string
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
  category?: string
  images?: string[]
}

/** Normalized catalog exercise shape used by the UI */
export type ExerciseDbExercise = {
  id: string
  name: string
  bodyPart: string
  target: string
  equipment: string
  secondaryMuscles?: string[]
  instructions?: string[]
  difficulty?: string
  category?: string
}

export function exerciseDbImageUrl(exerciseId: string) {
  const encodedId = exerciseId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `/exercises/${encodedId}/0.jpg`
}
