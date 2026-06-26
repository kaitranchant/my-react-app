import { PageHeader } from '@/components/dashboard/page-header'
import { PortalSessionsPanel } from '@/components/portal/portal-sessions-panel'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import { getPortalClientContext } from '@/lib/portal-client'
import {
  fetchClientCoachingAppointments,
  fetchClientSessionPacks,
  fetchPortalSessionBookingSettings,
  getPortalBookingDateKeys,
} from '@/lib/session-booking-queries'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Sessions — Client Portal',
}

export default async function PortalSessionsPage() {
  const portalCtx = await getPortalClientContext()
  if (!portalCtx) {
    redirect('/login')
  }

  const { client, supabase } = portalCtx
  const nowIso = new Date().toISOString()
  const horizonIso = new Date(
    Date.now() + 90 * 24 * 60 * 60 * 1000
  ).toISOString()

  const [settings, coachPreferences, appointments, sessionPacks] =
    await Promise.all([
      fetchPortalSessionBookingSettings(supabase),
      getCoachPreferencesForUser(client.coach_id),
      fetchClientCoachingAppointments(
        supabase,
        client.id,
        nowIso,
        horizonIso
      ),
      fetchClientSessionPacks(supabase, client.id),
    ])

  const dateOptions = getPortalBookingDateKeys(settings, coachPreferences.timezone)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description="Book and manage your 1:1 coaching sessions."
      />
      <PortalSessionsPanel
        appointments={appointments}
        sessionPacks={sessionPacks}
        settings={settings}
        coachPreferences={coachPreferences}
        dateOptions={dateOptions}
        bookingEnabled={settings.session_booking_enabled}
      />
    </div>
  )
}
