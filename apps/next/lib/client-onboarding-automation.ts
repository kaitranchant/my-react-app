import type { SupabaseClient } from '@supabase/supabase-js'

import { assignProgramToClientInternal } from '@/lib/program-assignment'
import { applyMessageTemplateVariables } from '@/lib/message-templates'
import { notifyClientOfCoachMessage } from '@/lib/notifications/notify-client-coach-message'
import { notifyCoachOfInviteAccepted } from '@/lib/notifications/notify-coach-invite-accepted'

export type ClientOnboardingAutomationResult = {
  clientId: string
  status: 'completed' | 'skipped' | 'failed'
  programAssigned: boolean
  welcomeMessageSent: boolean
  inviteAcceptedEmailSent: boolean
  error?: string
}

type AdminClient = SupabaseClient

export async function runClientOnboardingAutomation(
  admin: AdminClient,
  clientId: string
): Promise<ClientOnboardingAutomationResult> {
  const { data: client, error: clientError } = await admin
    .from('clients')
    .select(
      'id, coach_id, full_name, invite_status, invite_accepted_at, onboarding_automation_at, is_coach_self'
    )
    .eq('id', clientId)
    .maybeSingle()

  if (clientError || !client) {
    return {
      clientId,
      status: 'failed',
      programAssigned: false,
      welcomeMessageSent: false,
      inviteAcceptedEmailSent: false,
      error: clientError?.message ?? 'Client not found.',
    }
  }

  if (client.is_coach_self) {
    return {
      clientId,
      status: 'skipped',
      programAssigned: false,
      welcomeMessageSent: false,
      inviteAcceptedEmailSent: false,
    }
  }

  if (client.invite_status !== 'accepted') {
    return {
      clientId,
      status: 'skipped',
      programAssigned: false,
      welcomeMessageSent: false,
      inviteAcceptedEmailSent: false,
    }
  }

  if (client.onboarding_automation_at) {
    return {
      clientId,
      status: 'skipped',
      programAssigned: false,
      welcomeMessageSent: false,
      inviteAcceptedEmailSent: false,
    }
  }

  const { data: coachProfile, error: coachError } = await admin
    .from('profiles')
    .select(
      'default_onboarding_program_id, onboarding_welcome_template_id, weight_unit, week_starts_on, coach_timezone, default_check_in_frequency'
    )
    .eq('id', client.coach_id)
    .maybeSingle()

  if (coachError || !coachProfile) {
    return {
      clientId,
      status: 'failed',
      programAssigned: false,
      welcomeMessageSent: false,
      inviteAcceptedEmailSent: false,
      error: coachError?.message ?? 'Coach profile not found.',
    }
  }

  let programAssigned = false
  let welcomeMessageSent = false
  let inviteAcceptedEmailSent = false
  let automationError: string | undefined

  if (coachProfile.default_onboarding_program_id) {
    const { data: existingAssignment } = await admin
      .from('program_assignments')
      .select('id')
      .eq('client_id', clientId)
      .eq('coach_id', client.coach_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!existingAssignment) {
      const assignResult = await assignProgramToClientInternal(admin, {
        coachId: client.coach_id,
        clientId,
        programId: coachProfile.default_onboarding_program_id,
      })

      if (assignResult.success) {
        programAssigned = true
      } else {
        automationError = assignResult.error
      }
    }
  }

  if (coachProfile.onboarding_welcome_template_id) {
    const { data: template, error: templateError } = await admin
      .from('coach_message_templates')
      .select('id, body')
      .eq('id', coachProfile.onboarding_welcome_template_id)
      .eq('coach_id', client.coach_id)
      .maybeSingle()

    if (templateError) {
      automationError = automationError ?? templateError.message
    } else if (template?.body) {
      const body = applyMessageTemplateVariables(template.body, {
        clientName: client.full_name,
      })

      const { error: messageError } = await admin.from('client_messages').insert({
        client_id: client.id,
        coach_id: client.coach_id,
        sender_id: client.coach_id,
        sender_role: 'coach',
        message_type: 'text',
        body,
      })

      if (messageError) {
        automationError = automationError ?? messageError.message
      } else {
        welcomeMessageSent = true
        void notifyClientOfCoachMessage({
          clientId: client.id,
          coachId: client.coach_id,
          messageBody: body,
        })
      }
    }
  }

  try {
    inviteAcceptedEmailSent = await notifyCoachOfInviteAccepted({
      coachId: client.coach_id,
      clientId: client.id,
      clientName: client.full_name,
      programAssigned,
    })
  } catch (error) {
    automationError =
      automationError ??
      (error instanceof Error ? error.message : 'Could not notify coach.')
  }

  const { error: markError } = await admin
    .from('clients')
    .update({
      onboarding_automation_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .is('onboarding_automation_at', null)

  if (markError) {
    return {
      clientId,
      status: 'failed',
      programAssigned,
      welcomeMessageSent,
      inviteAcceptedEmailSent,
      error: markError.message,
    }
  }

  return {
    clientId,
    status: automationError ? 'failed' : 'completed',
    programAssigned,
    welcomeMessageSent,
    inviteAcceptedEmailSent,
    error: automationError,
  }
}

export async function processPendingClientOnboarding(
  admin: AdminClient,
  options?: { clientId?: string; limit?: number }
): Promise<ClientOnboardingAutomationResult[]> {
  let query = admin
    .from('clients')
    .select('id')
    .eq('invite_status', 'accepted')
    .is('onboarding_automation_at', null)
    .eq('is_coach_self', false)
    .order('invite_accepted_at', { ascending: true })

  if (options?.clientId) {
    query = query.eq('id', options.clientId)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data: clients, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const results: ClientOnboardingAutomationResult[] = []

  for (const client of clients ?? []) {
    results.push(await runClientOnboardingAutomation(admin, client.id))
  }

  return results
}

export async function triggerClientOnboardingForUser(
  admin: AdminClient,
  userId: string
): Promise<ClientOnboardingAutomationResult | null> {
  const { data: client, error } = await admin
    .from('clients')
    .select('id')
    .eq('user_id', userId)
    .eq('invite_status', 'accepted')
    .is('onboarding_automation_at', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!client) {
    return null
  }

  return runClientOnboardingAutomation(admin, client.id)
}
