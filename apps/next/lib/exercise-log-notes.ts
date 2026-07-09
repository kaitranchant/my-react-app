export function mergeCoachNotesForHistory(
  workoutNotes?: string | null,
  coachSessionNotes?: string | null
): string | null {
  const prescription = workoutNotes?.trim()
  const session = coachSessionNotes?.trim()
  if (prescription && session) {
    return `${prescription}\n\n${session}`
  }
  return prescription || session || null
}

export function getCoachNotesForExerciseLog(exercise: {
  workout_notes?: string | null
  coach_session_notes?: string | null
}): { prescriptionNotes: string | null; sessionNotes: string | null } {
  return {
    prescriptionNotes: exercise.workout_notes?.trim() || null,
    sessionNotes: exercise.coach_session_notes?.trim() || null,
  }
}

export function formatCoachNotesForExerciseLog(exercise: {
  workout_notes?: string | null
  coach_session_notes?: string | null
}): string | null {
  const { prescriptionNotes, sessionNotes } = getCoachNotesForExerciseLog(exercise)
  return mergeCoachNotesForHistory(prescriptionNotes, sessionNotes)
}

export function hasVisibleExerciseLogNotes(exercise: {
  workout_notes?: string | null
  coach_session_notes?: string | null
  client_notes?: string | null
}): boolean {
  return Boolean(
    exercise.workout_notes?.trim() ||
      exercise.coach_session_notes?.trim() ||
      exercise.client_notes?.trim()
  )
}
