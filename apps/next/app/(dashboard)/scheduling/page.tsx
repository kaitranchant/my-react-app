import Link from 'next/link'

import { PageHeader } from '@/components/dashboard/page-header'
import { AvailabilityExceptionsPanel } from '@/components/scheduling/availability-exceptions-panel'
import { AvailabilityGridEditor } from '@/components/scheduling/availability-grid-editor'
import { BookAppointmentDialog } from '@/components/scheduling/book-appointment-dialog'
import { BookingLinkCard } from '@/components/scheduling/booking-link-card'
import { SchedulingWeekPanel } from '@/components/scheduling/scheduling-week-panel'
import { SessionBookingSettingsForm } from '@/components/scheduling/session-booking-settings-form'
import { SessionPacksPanel } from '@/components/scheduling/session-packs-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAppBaseUrl } from '@/lib/email/config'
import { getCoachPreferencesForUser } from '@/lib/coach-preferences-server'
import {
  fetchCoachAvailabilityRules,
  fetchCoachAvailabilityExceptions,
  fetchCoachSessionPacks,
  fetchCoachingAppointments,
  fetchCoachSessionBookingSettings,
  getPortalBookingDateKeys,
  getWeekAppointmentRange,
} from '@/lib/session-booking-queries'
import { addDaysToDateKey, parseDateKey } from '@/lib/calendar'
import { getCoachDateKeyFromReference } from '@/lib/session-booking-slots'
import { sessionBookingSettingsToFormValues } from '@/lib/session-booking-types'
import { createClient } from '@/lib/supabase/server'
import { parseSchedulingViewMode } from '@/lib/validations/session-booking'

export const metadata = {
  title: 'Scheduling — Coaching App',
}

export default async function SchedulingPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string }>
}) {
  const { view: viewParam, week: weekParam } = await searchParams
  const view = parseSchedulingViewMode(viewParam)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const coachPreferences = await getCoachPreferencesForUser(user.id)
  const weekReferenceDate =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? parseDateKey(weekParam)
      : new Date()
  const { startIso, endIso, weekKeys } = getWeekAppointmentRange(
    coachPreferences.weekStartsOn,
    coachPreferences.timezone,
    weekReferenceDate
  )

  const [
    settings,
    rules,
    appointments,
    sessionPacks,
    { data: clients },
    { data: profile },
  ] = await Promise.all([
    fetchCoachSessionBookingSettings(supabase, user.id),
    fetchCoachAvailabilityRules(supabase, user.id),
    fetchCoachingAppointments(supabase, user.id, startIso, endIso),
    fetchCoachSessionPacks(supabase, user.id),
    supabase
      .from('clients')
      .select('id, full_name')
      .eq('coach_id', user.id)
      .eq('status', 'active')
      .order('full_name'),
    supabase
      .from('profiles')
      .select('full_name, business_name')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  const todayKey = getCoachDateKeyFromReference(coachPreferences.timezone)
  const exceptionHorizonKey = addDaysToDateKey(todayKey, 90)
  const availabilityExceptions = await fetchCoachAvailabilityExceptions(
    supabase,
    user.id,
    todayKey,
    exceptionHorizonKey
  )

  const bookingDateKeys = getPortalBookingDateKeys(
    settings,
    coachPreferences.timezone
  )

  const coachDisplayName =
    profile?.business_name?.trim() || profile?.full_name?.trim() || null

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader
        title="Scheduling"
        description="Manage coach availability, book 1:1 sessions, and track session packs."
      >
        <BookAppointmentDialog
          clients={clients ?? []}
          sessionPacks={sessionPacks}
          dateOptions={bookingDateKeys}
          defaultLocation={settings.default_session_location}
          requiresSessionPack={settings.booking_requires_session_pack}
        />
      </PageHeader>

      <Tabs value={view} className="space-y-6">
        <TabsList>
          <TabsTrigger value="week" asChild>
            <Link href="/scheduling?view=week">This week</Link>
          </TabsTrigger>
          <TabsTrigger value="availability" asChild>
            <Link href="/scheduling?view=availability">Availability</Link>
          </TabsTrigger>
          <TabsTrigger value="packs" asChild>
            <Link href="/scheduling?view=packs">Session packs</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sessions this week</CardTitle>
            </CardHeader>
            <CardContent>
              <SchedulingWeekPanel
                appointments={appointments}
                coachPreferences={coachPreferences}
                sessionPacks={sessionPacks}
                weekKeys={weekKeys}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <BookingLinkCard
                bookingEnabled={settings.session_booking_enabled}
                coachName={coachDisplayName}
                appBaseUrl={getAppBaseUrl()}
              />
              <SessionBookingSettingsForm
                defaultValues={sessionBookingSettingsToFormValues(settings)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Weekly availability</CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityGridEditor initialRules={rules} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exceptions</CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityExceptionsPanel
                initialExceptions={availabilityExceptions}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Calendar sync</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Google Calendar and Apple Calendar sync are coming soon. For now,
                use the weekly calendar view to manage sessions in one place.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="packs">
          <Card>
            <CardHeader>
              <CardTitle>Session packs</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionPacksPanel
                clients={clients ?? []}
                packs={sessionPacks}
                coachTimezone={coachPreferences.timezone}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
