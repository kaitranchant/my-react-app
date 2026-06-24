import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/page-header'
import { AccountSettings } from '@/components/settings/account-settings'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { CoachingPreferencesForm } from '@/components/settings/coaching-preferences'
import { OnboardingAutomationForm } from '@/components/settings/onboarding-automation-form'
import { parseCoachPreferences } from '@/lib/coach-preferences'
import { fetchCoachMessageTemplates } from '@/lib/message-templates'
import { isEmailDeliveryConfigured } from '@/lib/email/config'
import { parseNotificationPreferences } from '@/lib/notification-preferences'
import { NotificationSettings } from '@/components/settings/notification-settings'
import { WebPushSettings } from '@/components/notifications/web-push-settings'
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form'
import { SettingsNav } from '@/components/settings/settings-nav'
import { SettingsSection } from '@/components/settings/settings-section'

export const metadata = {
  title: 'Settings — Coaching App',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, business_name, avatar_url, weight_unit, week_starts_on, coach_timezone, default_check_in_frequency, default_onboarding_program_id, onboarding_welcome_template_id, notify_check_ins, notify_form_reviews, notify_workout_completions, notify_missed_sessions, notify_invite_accepted, notify_prs, notify_weekly_summary, notify_appointment_reminders'
    )
    .eq('id', user!.id)
    .single()

  const [{ data: programs }, { templates: messageTemplates }] = await Promise.all([
    supabase
      .from('programs')
      .select('id, name, status')
      .eq('coach_id', user!.id)
      .order('name', { ascending: true }),
    fetchCoachMessageTemplates(supabase, user!.id),
  ])

  const profileDefaults = {
    fullName: profile?.full_name?.trim() ?? '',
    businessName: profile?.business_name?.trim() ?? '',
  }
  const coachingPreferences = parseCoachPreferences(profile)
  const notificationPreferences = parseNotificationPreferences(profile)
  const onboardingAutomationDefaults = {
    defaultOnboardingProgramId: profile?.default_onboarding_program_id ?? '',
    onboardingWelcomeTemplateId: profile?.onboarding_welcome_template_id ?? '',
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <PageHeader
        title="Settings"
        description="Manage your profile, coaching preferences, and account."
      />

      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <SettingsNav />

        <div className="space-y-6">
          <SettingsSection
            id="profile"
            title="Profile"
            description="Your name and coaching brand shown across the app."
          >
            <ProfileSettingsForm
              defaultValues={profileDefaults}
              email={user?.email ?? ''}
              avatarUrl={profile?.avatar_url}
            />
          </SettingsSection>

          <SettingsSection
            id="appearance"
            title="Appearance"
            description="Customize how the app looks on your device."
          >
            <AppearanceSettings />
          </SettingsSection>

          <SettingsSection
            id="coaching"
            title="Coaching preferences"
            description="Defaults applied when working with clients and programs."
          >
            <CoachingPreferencesForm defaultValues={coachingPreferences} />
          </SettingsSection>

          <SettingsSection
            id="onboarding"
            title="Onboarding automation"
            description="Automatically assign a program and send a welcome message when a client accepts their invite."
          >
            <OnboardingAutomationForm
              defaultValues={onboardingAutomationDefaults}
              programs={programs ?? []}
              messageTemplates={messageTemplates}
            />
          </SettingsSection>

          <SettingsSection
            id="notifications"
            title="Notifications"
            description="Choose what you want to be notified about. Enable browser pop-ups below for alerts when the app is in the background."
          >
            <NotificationSettings
              defaultValues={notificationPreferences}
              emailDeliveryEnabled={isEmailDeliveryConfigured()}
            />
            <WebPushSettings role="coach" />
          </SettingsSection>

          <SettingsSection
            id="account"
            title="Account"
            description="Security and account management."
          >
            <AccountSettings />
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}
