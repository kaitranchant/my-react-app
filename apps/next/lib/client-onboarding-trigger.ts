import { createAdminClient } from '@/lib/supabase/admin'
import { triggerClientOnboardingForUser } from '@/lib/client-onboarding-automation'

export async function runOnboardingAutomationForUser(userId: string) {
  const admin = createAdminClient()
  if (!admin) {
    return
  }

  try {
    await triggerClientOnboardingForUser(admin, userId)
  } catch {
    // Cron route will retry pending automations.
  }
}
