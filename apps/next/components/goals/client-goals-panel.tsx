import { ClientGoalsEditor } from '@/components/goals/client-goals-editor'
import { ClientGoalsPreview } from '@/components/goals/client-goals-preview'
import type { GoalProgressContext } from '@/lib/goal-progress-context'
import type { CoachPreferences } from '@/lib/coach-preferences'
import type { Client, ClientGoal, Exercise, Program } from 'app/types/database'

type ClientGoalsPanelProps = {
  client: Pick<Client, 'id' | 'full_name'>
  goals: ClientGoal[]
  progressContext: GoalProgressContext
  exercises: Pick<Exercise, 'id' | 'name'>[]
  programs: Pick<Program, 'id' | 'name' | 'status'>[]
  coachPreferences?: Pick<CoachPreferences, 'weekStartsOn' | 'timezone'>
  schemaError?: string | null
}

export function ClientGoalsPanel({
  client,
  goals,
  progressContext,
  exercises,
  programs,
  coachPreferences,
  schemaError = null,
}: ClientGoalsPanelProps) {
  const clientFirstName = client.full_name.split(' ')[0]

  return (
    <div className="grid gap-6">
      <ClientGoalsEditor
        clientId={client.id}
        goals={goals}
        exercises={exercises}
        programs={programs}
        schemaError={schemaError}
      />

      {!schemaError?.includes('Could not find the table') ? (
        <ClientGoalsPreview
          clientFirstName={clientFirstName}
          goals={goals}
          progressContext={progressContext}
          coachPreferences={coachPreferences}
        />
      ) : null}
    </div>
  )
}
