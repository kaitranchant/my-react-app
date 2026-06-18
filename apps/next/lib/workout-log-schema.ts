export function isWorkoutLogSchemaError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('workout_log_sets') ||
    normalized.includes('started_at') ||
    normalized.includes('completed_at') ||
    normalized.includes('in_progress') ||
    normalized.includes('row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('42501') ||
    (normalized.includes('could not find the table') &&
      normalized.includes('workout'))
  )
}

export function isPortalWorkoutSchemaError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('row-level security') ||
    normalized.includes('permission denied') ||
    normalized.includes('42501') ||
    normalized.includes('policy')
  )
}

export const WORKOUT_LOG_SQL_FILE = 'apply-workout-logging.sql'

export const PORTAL_WORKOUT_SQL_FILE = 'apply-client-portal.sql'

export const WORKOUT_LOG_SCHEMA_TABLES = [
  'workout_log_sets',
  'client_scheduled_workouts (started_at, completed_at)',
]

export const PORTAL_WORKOUT_SCHEMA_TABLES = [
  'client_scheduled_workouts (client UPDATE)',
  'workout_log_sets (client DELETE)',
]

export function getWorkoutLogSchemaSetup(
  error: string,
  isClientPortal: boolean
): { sqlFile: string; tables: string[] } {
  if (isClientPortal && isPortalWorkoutSchemaError(error)) {
    return {
      sqlFile: PORTAL_WORKOUT_SQL_FILE,
      tables: PORTAL_WORKOUT_SCHEMA_TABLES,
    }
  }
  return { sqlFile: WORKOUT_LOG_SQL_FILE, tables: WORKOUT_LOG_SCHEMA_TABLES }
}
