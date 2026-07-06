import { getAppBaseUrl } from '@/lib/email/config'
import { sendOnboardingDocumentsCompleteEmail } from '@/lib/email/onboarding-documents-complete'
import { createAdminClient } from '@/lib/supabase/admin'

export async function notifyCoachOnboardingDocumentsComplete({
  coachId,
  clientId,
  clientName,
  documentNames,
}: {
  coachId: string
  clientId: string
  clientName: string
  documentNames: string[]
}) {
  const admin = createAdminClient()
  if (!admin) return

  const { data: coachProfile } = await admin
    .from('profiles')
    .select('full_name, notify_invite_accepted')
    .eq('id', coachId)
    .maybeSingle()

  if (coachProfile?.notify_invite_accepted === false) {
    return
  }

  const { data: authUser } = await admin.auth.admin.getUserById(coachId)
  const coachEmail = authUser.user?.email
  if (!coachEmail) return

  const clientUrl = `${getAppBaseUrl().replace(/\/$/, '')}/clients/${clientId}`

  await sendOnboardingDocumentsCompleteEmail({
    coachName: coachProfile?.full_name?.trim() || 'Coach',
    coachEmail,
    clientName,
    clientUrl,
    documentNames,
  })
}
