export function isWorkoutLogSchemaError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('workout_log_sets') ||
    normalized.includes('started_at') ||
    normalized.includes('completed_at') ||
    normalized.includes('in_progress') ||
    normalized.includes('row-level security') ||
    (normalized.includes('could not find the table') &&
      normalized.includes('workout'))
  )
}

export const WORKOUT_LOG_SQL_FILE = 'apply-workout-logging.sql'

export const PORTAL_WORKOUT_SQL_FILE = 'apply-client-portal.sql'

export const WORKOUT_LOG_SCHEMA_TABLES = [
  'workout_log_sets',
  'client_scheduled_workouts (started_at, completed_at)',
]
