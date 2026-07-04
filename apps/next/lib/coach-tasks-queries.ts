import type { CoachTask } from '@/lib/coach-tasks'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchCoachTasks(
  supabase: SupabaseClient,
  coachId: string
): Promise<CoachTask[]> {
  const { data, error } = await supabase
    .from('coach_tasks')
    .select(
      `
      id,
      coach_id,
      client_id,
      title,
      details,
      due_date,
      priority,
      status,
      completed_at,
      created_at,
      updated_at,
      client:clients(id, full_name)
    `
    )
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((row) => {
    const client = Array.isArray(row.client) ? row.client[0] : row.client

    return {
      id: row.id,
      coach_id: row.coach_id,
      client_id: row.client_id,
      title: row.title,
      details: row.details,
      due_date: row.due_date,
      priority: row.priority,
      status: row.status,
      completed_at: row.completed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      client: client ?? null,
    } satisfies CoachTask
  })
}

export async function countCoachTasksDueToday(
  supabase: SupabaseClient,
  coachId: string,
  todayKey: string
): Promise<number> {
  const { count, error } = await supabase
    .from('coach_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'pending')
    .eq('due_date', todayKey)

  if (error) {
    return 0
  }

  return count ?? 0
}
