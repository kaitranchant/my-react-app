import { PageHeader } from '@/components/dashboard/page-header'
import { UpgradePrompt } from '@/components/subscription/upgrade-prompt'
import { BookAppointmentDialog } from '@/components/scheduling/book-appointment-dialog'
import { SchedulingPageTabs } from '@/components/scheduling/scheduling-page-tabs'
import { ensureCoachAppointmentSeriesHorizon } from '@/app/(dashboard)/scheduling/actions'
import { getAppBaseUrl } from '@/lib/email/config'
import {
  attachGoogleEventMarkers,
  fetchGoogleCalendarBlockedTimes,
} from '@/lib/google-calendar/blocked-times'
import { fetchCoachGoogleCalendarConnection } from '@/lib/google-calendar/connection'
import { reconcileGoogleDeletedAppointmentsForCoach } from '@/lib/google-calendar/inbound-sync'
import { isGoogleCalendarConfigured } from '@/lib/google-calendar/config'
import { registerGoogleCalendarWatch } from '@/lib/google-calendar/watch'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import {
  fetchClientWeeklySessionTargets,
  fetchCoachAvailabilityRules,
  fetchCoachAvailabilityExceptions,
  fetchCoachSessionPacks,
  fetchCoachingAppointments,
  fetchCoachSessionBookingSettings,
  getPortalBookingDateKeys,
  getSchedulingWeekReferenceDate,
  getWeekAppointmentRange,
} from '@/lib/session-booking-queries'
import { addDaysToDateKey } from '@/lib/calendar'
import { getCoachDateKeyFromReference } from '@/lib/session-booking-slots'
import { fetchCoachTasks } from '@/lib/coach-tasks-queries'
import { sessionBookingSettingsToFormValues } from '@/lib/session-booking-types'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionGate } from '@/lib/subscription-server'
import { parseSchedulingViewMode } from '@/lib/validations/session-booking'

export const metadata = {
  title: 'Scheduling — Coaching App',
}

export default async function SchedulingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string; error?: string; connected?: string }>
}) {
  const gate = await getSubscriptionGate('scheduling')
  if (!gate.allowed) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Scheduling"
          description="Manage sessions, availability, session packs, and your coach to-do list."
        />
        <UpgradePrompt gate={gate} />
      </div>
    )
  }

  const { view: viewParam, week: weekParam, error: connectError, connected } =
    await searchParams
  const view = parseSchedulingViewMode(viewParam)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const coachPreferences = await getCoachPreferencesForUser(user.id)
  const weekReferenceDate = getSchedulingWeekReferenceDate(
    coachPreferences.timezone,
    weekParam
  )
  const { startIso, endIso, weekKeys } = getWeekAppointmentRange(
    coachPreferences.weekStartsOn,
    coachPreferences.timezone,
    weekReferenceDate
  )

  void ensureCoachAppointmentSeriesHorizon(user.id)

  const todayKey = getCoachDateKeyFromReference(coachPreferences.timezone)
  const exceptionHorizonKey = addDaysToDateKey(todayKey, 90)

  const [
    settings,
    rules,
    sessionPacks,
    coachTasks,
    { data: clients },
    { data: profile },
    googleCalendarConnection,
    availabilityExceptions,
  ] = await Promise.all([
    fetchCoachSessionBookingSettings(supabase, user.id),
    fetchCoachAvailabilityRules(supabase, user.id),
    fetchCoachSessionPacks(supabase, user.id),
    fetchCoachTasks(supabase, user.id),
    supabase
      .from('clients')
      .select('id, full_name, weekly_session_target')
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .order('full_name'),
    supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', user.id)
      .maybeSingle(),
    fetchCoachGoogleCalendarConnection(supabase, user.id),
    fetchCoachAvailabilityExceptions(
      supabase,
      user.id,
      todayKey,
      exceptionHorizonKey
    ),
  ])

  if (googleCalendarConnection) {
    try {
      await reconcileGoogleDeletedAppointmentsForCoach(user.id, {
        timeMin: startIso,
        timeMax: endIso,
        supabase,
        revalidate: false,
      })
    } catch (error) {
      console.error('[google-calendar] scheduling page reconcile failed', error)
    }
  }

  const appointments = await fetchCoachingAppointments(
    supabase,
    user.id,
    startIso,
    endIso
  )

  const googleBlockedTimesFetch = googleCalendarConnection
    ? await fetchGoogleCalendarBlockedTimes(user.id, startIso, endIso)
    : null
  const googleCalendarAuthExpired = googleBlockedTimesFetch?.authExpired ?? false
  const rawGoogleBlockedTimes = googleBlockedTimesFetch?.blockedTimes ?? []
  const googleBlockedTimes = await attachGoogleEventMarkers(
    supabase,
    user.id,
    rawGoogleBlockedTimes
  )

  const weekStartKey = weekKeys[0]!
  const weekOverrides = settings.weekly_session_targets_enabled
    ? await fetchClientWeeklySessionTargets(supabase, user.id, weekStartKey)
    : []

  const bookingDateKeys = getPortalBookingDateKeys(
    settings,
    coachPreferences.timezone
  )

  const coachDisplayName =
    profile?.business_name?.trim() || profile?.full_name?.trim() || null

  if (
    googleCalendarConnection &&
    !googleCalendarAuthExpired &&
    isGoogleCalendarConfigured() &&
    (!googleCalendarConnection.watch_channel_id ||
      (googleCalendarConnection.watch_expiration &&
        Date.parse(googleCalendarConnection.watch_expiration) < Date.now()))
  ) {
    void registerGoogleCalendarWatch(googleCalendarConnection)
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Scheduling"
        description="Manage sessions, availability, session packs, and your coach to-do list."
      >
        <BookAppointmentDialog
          clients={clients ?? []}
          sessionPacks={sessionPacks}
          dateOptions={bookingDateKeys}
          defaultLocation={settings.default_session_location}
          requiresSessionPack={settings.booking_requires_session_pack}
          weekStartsOn={coachPreferences.weekStartsOn}
        />
      </PageHeader>

      <SchedulingPageTabs
        initialView={view}
        appointments={appointments}
        coachPreferences={coachPreferences}
        sessionPacks={sessionPacks}
        weekKeys={weekKeys}
        clients={clients ?? []}
        bookingDateKeys={bookingDateKeys}
        settings={settings}
        settingsFormValues={sessionBookingSettingsToFormValues(settings)}
        rules={rules}
        availabilityExceptions={availabilityExceptions}
        coachTasks={coachTasks}
        todayKey={todayKey}
        coachDisplayName={coachDisplayName}
        appBaseUrl={getAppBaseUrl()}
        googleCalendarConfigured={isGoogleCalendarConfigured()}
        googleCalendarConnection={googleCalendarConnection}
        googleCalendarAuthExpired={googleCalendarAuthExpired}
        connectError={connectError ?? null}
        connectSuccess={connected === 'google_calendar'}
        googleBlockedTimes={googleBlockedTimes}
        weekOverrides={weekOverrides}
      />
    </div>
  )
}
