'use server'

import { revalidatePath } from 'next/cache'

import { attachSignedUrlsToAssessmentMedia } from '@/lib/assessments'
import { requireTeamAccess, requireUser } from '@/lib/gym-access'
import {
  createTeamAssessmentSessionSchema,
  normalizeScoreDataForSave,
  parseRubricConfig,
  saveTeamAssessmentResultSchema,
  type CreateTeamAssessmentSessionValues,
  type SaveTeamAssessmentResultValues,
} from '@/lib/validations/assessment'
import type {
  ClientAssessmentMediaWithUrl,
  ClientAssessmentResult,
  ClientAssessmentResultWithMedia,
  Json,
  TeamAssessmentSession,
  TeamAssessmentSessionItem,
} from 'app/types/database'

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

export type TeamAssessmentSessionSummary = TeamAssessmentSession & {
  itemCount: number
  memberCount: number
  scoredCount: number
}

export type TeamAssessmentSessionMember = {
  clientId: string
  assessmentId: string
  name: string
  avatarUrl: string | null
}

export type TeamAssessmentSessionDetail = {
  session: TeamAssessmentSession
  items: TeamAssessmentSessionItem[]
  members: TeamAssessmentSessionMember[]
  results: ClientAssessmentResultWithMedia[]
}

function revalidateTeamAssessmentPaths(teamId: string, clientIds: string[]) {
  revalidatePath(`/teams/${teamId}`)
  for (const clientId of clientIds) {
    revalidatePath(`/clients/${clientId}`)
  }
}

export async function createTeamAssessmentSession(
  values: CreateTeamAssessmentSessionValues
): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = createTeamAssessmentSessionSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? 'Please check the session and try again.',
    }
  }

  const access = await requireTeamAccess(parsed.data.teamId)
  if (!access) {
    return { success: false, error: 'Team not found.' }
  }
  const { supabase, user, team } = access

  for (const item of parsed.data.items) {
    const configResult = parseRubricConfig(item.rubricType, item.rubricConfig)
    if (!configResult.success) {
      return { success: false, error: configResult.error }
    }
  }

  const { data: memberRows, error: membersError } = await supabase
    .from('team_members')
    .select('client_id')
    .eq('team_id', team.id)

  if (membersError) {
    return { success: false, error: membersError.message }
  }
  const memberClientIds = Array.from(
    new Set((memberRows ?? []).map((row) => row.client_id))
  )
  if (memberClientIds.length === 0) {
    return {
      success: false,
      error: 'Add athletes to this team before running a team assessment.',
    }
  }

  const assessedAt = parsed.data.assessedAt ?? new Date().toISOString()
  const title = parsed.data.title ?? 'Team assessment'

  const { data: session, error: sessionError } = await supabase
    .from('team_assessment_sessions')
    .insert({
      team_id: team.id,
      coach_id: user.id,
      title,
      assessed_at: assessedAt,
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    return {
      success: false,
      error: sessionError?.message ?? 'Could not create the team session.',
    }
  }

  const itemRows = parsed.data.items.map((item, index) => ({
    session_id: session.id,
    assessment_item_id: item.assessmentItemId ?? null,
    item_name: item.itemName,
    item_category: item.itemCategory,
    rubric_type: item.rubricType,
    rubric_config: (item.rubricConfig ?? {}) as Json,
    sort_order: item.sortOrder ?? index,
  }))

  const { error: itemsError } = await supabase
    .from('team_assessment_session_items')
    .insert(itemRows)

  if (itemsError) {
    await supabase.from('team_assessment_sessions').delete().eq('id', session.id)
    return { success: false, error: itemsError.message }
  }

  // One client_assessments row per roster member; scores are added as each
  // athlete is tested. Skip members the coach can no longer access rather
  // than failing the whole session.
  const memberAssessmentRows = memberClientIds.map((clientId) => ({
    client_id: clientId,
    coach_id: user.id,
    title,
    assessed_at: assessedAt,
    source: 'manual' as const,
    team_assessment_session_id: session.id,
  }))

  const { error: bulkError } = await supabase
    .from('client_assessments')
    .insert(memberAssessmentRows)

  if (bulkError) {
    let insertedCount = 0
    for (const row of memberAssessmentRows) {
      const { error: rowError } = await supabase
        .from('client_assessments')
        .insert(row)
      if (!rowError) insertedCount += 1
    }
    if (insertedCount === 0) {
      await supabase.from('team_assessment_sessions').delete().eq('id', session.id)
      return {
        success: false,
        error: 'Could not add team members to the session.',
      }
    }
  }

  revalidateTeamAssessmentPaths(team.id, memberClientIds)
  return { success: true, data: { sessionId: session.id } }
}

export async function fetchTeamAssessmentSessions(
  teamId: string
): Promise<TeamAssessmentSessionSummary[]> {
  const access = await requireTeamAccess(teamId)
  if (!access) return []
  const { supabase } = access

  const { data: sessions, error } = await supabase
    .from('team_assessment_sessions')
    .select('*')
    .eq('team_id', teamId)
    .order('assessed_at', { ascending: false })

  if (error || !sessions?.length) {
    return []
  }

  const sessionIds = sessions.map((session) => session.id)

  const [{ data: itemRows }, { data: memberRows }] = await Promise.all([
    supabase
      .from('team_assessment_session_items')
      .select('id, session_id')
      .in('session_id', sessionIds),
    supabase
      .from('client_assessments')
      .select('id, team_assessment_session_id')
      .in('team_assessment_session_id', sessionIds),
  ])

  const memberAssessmentIds = (memberRows ?? []).map((row) => row.id)
  let resultRows: { id: string; assessment_id: string }[] = []
  if (memberAssessmentIds.length > 0) {
    const { data } = await supabase
      .from('client_assessment_results')
      .select('id, assessment_id')
      .in('assessment_id', memberAssessmentIds)
    resultRows = data ?? []
  }

  const sessionIdByAssessmentId = new Map<string, string>()
  for (const row of memberRows ?? []) {
    if (row.team_assessment_session_id) {
      sessionIdByAssessmentId.set(row.id, row.team_assessment_session_id)
    }
  }

  return sessions.map((session) => {
    const itemCount = (itemRows ?? []).filter(
      (row) => row.session_id === session.id
    ).length
    const memberCount = (memberRows ?? []).filter(
      (row) => row.team_assessment_session_id === session.id
    ).length
    const scoredCount = resultRows.filter(
      (row) => sessionIdByAssessmentId.get(row.assessment_id) === session.id
    ).length

    return { ...session, itemCount, memberCount, scoredCount }
  })
}

export async function fetchTeamAssessmentSessionDetail(
  sessionId: string
): Promise<ActionResult<TeamAssessmentSessionDetail>> {
  const { supabase } = await requireUser()

  const { data: session, error: sessionError } = await supabase
    .from('team_assessment_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return { success: false, error: 'Team assessment session not found.' }
  }

  const [{ data: items, error: itemsError }, { data: memberRows, error: membersError }] =
    await Promise.all([
      supabase
        .from('team_assessment_session_items')
        .select('*')
        .eq('session_id', sessionId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('client_assessments')
        .select('id, client_id, client:clients(id, full_name, avatar_url)')
        .eq('team_assessment_session_id', sessionId),
    ])

  if (itemsError || membersError) {
    return {
      success: false,
      error: itemsError?.message ?? membersError?.message ?? 'Could not load session.',
    }
  }

  const members: TeamAssessmentSessionMember[] = (memberRows ?? [])
    .map((row) => {
      const client = row.client as unknown as {
        id: string
        full_name: string | null
        avatar_url: string | null
      } | null
      return {
        clientId: row.client_id,
        assessmentId: row.id,
        name: client?.full_name ?? 'Athlete',
        avatarUrl: client?.avatar_url ?? null,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  let results: ClientAssessmentResultWithMedia[] = []
  const assessmentIds = members.map((member) => member.assessmentId)
  if (assessmentIds.length > 0) {
    const { data: resultRows, error: resultsError } = await supabase
      .from('client_assessment_results')
      .select('*')
      .in('assessment_id', assessmentIds)
      .order('sort_order', { ascending: true })

    if (resultsError) {
      return { success: false, error: resultsError.message }
    }

    const resultIds = (resultRows ?? []).map((row) => row.id)
    const mediaByResult = new Map<string, ClientAssessmentMediaWithUrl[]>()
    if (resultIds.length > 0) {
      const { data: mediaRows } = await supabase
        .from('client_assessment_media')
        .select('*')
        .in('result_id', resultIds)
        .order('sort_order', { ascending: true })

      const mediaWithUrls = await attachSignedUrlsToAssessmentMedia(
        supabase,
        mediaRows ?? []
      )
      for (const media of mediaWithUrls) {
        const list = mediaByResult.get(media.result_id) ?? []
        list.push(media)
        mediaByResult.set(media.result_id, list)
      }
    }

    results = (resultRows ?? []).map((row) => ({
      ...row,
      media: mediaByResult.get(row.id) ?? [],
    }))
  }

  return {
    success: true,
    data: { session, items: items ?? [], members, results },
  }
}

export async function saveTeamAssessmentResult(
  values: SaveTeamAssessmentResultValues
): Promise<ActionResult<{ assessmentId: string; resultId: string; result: ClientAssessmentResult }>> {
  const parsed = saveTeamAssessmentResultSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Please check the score and try again.',
    }
  }

  const { supabase } = await requireUser()

  const { data: session, error: sessionError } = await supabase
    .from('team_assessment_sessions')
    .select('id, team_id')
    .eq('id', parsed.data.sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return { success: false, error: 'Team assessment session not found.' }
  }

  const { data: memberAssessment, error: memberError } = await supabase
    .from('client_assessments')
    .select('id, client_id')
    .eq('team_assessment_session_id', session.id)
    .eq('client_id', parsed.data.clientId)
    .maybeSingle()

  if (memberError || !memberAssessment) {
    return { success: false, error: 'This athlete is not part of the session.' }
  }

  const input = parsed.data.result
  const configResult = parseRubricConfig(input.rubricType, input.rubricConfig)
  if (!configResult.success) {
    return { success: false, error: configResult.error }
  }

  const measurementUnit =
    input.rubricType === 'measurement'
      ? input.measurementUnit ??
        (typeof configResult.config.unit === 'string'
          ? configResult.config.unit
          : null)
      : null

  const normalized = normalizeScoreDataForSave({
    rubricType: input.rubricType,
    rubricConfig: configResult.config,
    scaleScore: input.scaleScore,
    passFail: input.passFail,
    measurementValue: input.measurementValue,
    scoreData: input.scoreData,
  })

  const row = {
    assessment_id: memberAssessment.id,
    assessment_item_id: input.assessmentItemId ?? null,
    item_name: input.itemName,
    item_category: input.itemCategory,
    rubric_type: input.rubricType,
    rubric_config: configResult.config as Json,
    scale_score: normalized.scaleScore,
    pass_fail: normalized.passFail,
    measurement_value: normalized.measurementValue,
    measurement_unit: measurementUnit,
    score_data: normalized.scoreData as Json,
    notes: input.notes,
    sort_order: input.sortOrder ?? 0,
  }

  // Results are created lazily on first score; re-scoring updates in place.
  const { data: existingResults } = await supabase
    .from('client_assessment_results')
    .select('id, assessment_item_id, item_name')
    .eq('assessment_id', memberAssessment.id)

  const existing = (existingResults ?? []).find((candidate) =>
    input.assessmentItemId && candidate.assessment_item_id
      ? candidate.assessment_item_id === input.assessmentItemId
      : candidate.item_name === input.itemName
  )

  let saved: ClientAssessmentResult | null = null

  if (existing) {
    const { data, error } = await supabase
      .from('client_assessment_results')
      .update(row)
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) {
      return { success: false, error: error?.message ?? 'Could not save the score.' }
    }
    saved = data
  } else {
    const { data, error } = await supabase
      .from('client_assessment_results')
      .insert(row)
      .select('*')
      .single()

    if (error || !data) {
      return { success: false, error: error?.message ?? 'Could not save the score.' }
    }
    saved = data
  }

  revalidateTeamAssessmentPaths(session.team_id, [memberAssessment.client_id])
  return {
    success: true,
    data: {
      assessmentId: memberAssessment.id,
      resultId: saved.id,
      result: saved,
    },
  }
}

export async function completeTeamAssessmentSession(input: {
  sessionId: string
  overallNotes?: string | null
}): Promise<ActionResult<void>> {
  const { supabase } = await requireUser()

  const { data: session, error: sessionError } = await supabase
    .from('team_assessment_sessions')
    .select('id, team_id')
    .eq('id', input.sessionId)
    .maybeSingle()

  if (sessionError || !session) {
    return { success: false, error: 'Team assessment session not found.' }
  }

  const { error } = await supabase
    .from('team_assessment_sessions')
    .update({
      status: 'completed',
      overall_notes: input.overallNotes?.trim() || null,
    })
    .eq('id', session.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidateTeamAssessmentPaths(session.team_id, [])
  return { success: true, data: undefined }
}
