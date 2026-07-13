import { BillingSettings } from '@/components/settings/billing-settings'
import { PaymentsSettings } from '@/components/settings/payments-settings'
import { SchemaSetupNotice } from '@/components/library/schema-setup-notice'
import { createClient } from '@/lib/supabase/server'
import {
  CLIENT_BILLING_SCHEMA_TABLES,
  CLIENT_BILLING_SQL_FILE,
} from '@/lib/client-billing-schema'
import { loadCoachConnectStatusSafe } from '@/lib/client-billing-page-data'
import { getCoachSubscriptionContext } from '@/lib/subscription-entitlements'
import { getAppBaseUrl } from '@/lib/email/config'
import { isStripeConfigured, getStripeKeyMode, getLiveModeHttpsRedirectError } from '@/lib/stripe/config'
import { syncCoachConnectStatus } from '@/lib/stripe/connect'
import type { ConnectAccountStatus } from '@/lib/stripe/connect'
import { PageHeader } from '@/components/dashboard/page-header'
import { AccountSettings } from '@/components/settings/account-settings'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { CoachingPreferencesForm } from '@/components/settings/coaching-preferences'
import { OnboardingAutomationForm } from '@/components/settings/onboarding-automation-form'
import { OnboardingDocumentTemplatesSettings } from '@/components/settings/onboarding-document-templates-settings'
import { OnboardingMilestoneTemplateSettings } from '@/components/settings/onboarding-milestone-template-settings'
import { fetchCoachOnboardingDocuments } from '@/lib/onboarding-data'
import { parseCoachPreferences } from '@/lib/coach-preferences'
import { parseOnboardingMilestoneTemplate } from '@/lib/client-onboarding'
import { fetchCoachMessageTemplates } from '@/lib/message-templates'
import { isEmailDeliveryConfigured } from '@/lib/email/config'
import { parseNotificationPreferences } from '@/lib/notification-preferences'
import { parseCoachClientNotificationPreferences } from '@/lib/coach-client-notification-preferences'
import { NotificationSettings } from '@/components/settings/notification-settings'
import { CoachClientNotificationSettings } from '@/components/settings/coach-client-notification-settings'
import { SettingsSubsection } from '@/components/settings/settings-subsection'
import { WebPushSettings } from '@/components/notifications/web-push-settings'
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form'
import { SettingsNav } from '@/components/settings/settings-nav'
import { SettingsSection } from '@/components/settings/settings-section'

export const metadata = {
  title: 'Settings — Coaching App',
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; connect?: string }>
}) {
  const { checkout, connect } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'full_name, business_name, avatar_url, weight_unit, week_starts_on, coach_timezone, default_check_in_frequency, default_workout_log_view, default_onboarding_program_id, onboarding_welcome_template_id, onboarding_milestone_template, notify_check_ins, notify_form_reviews, notify_workout_completions, notify_missed_sessions, notify_invite_accepted, notify_prs, notify_weekly_summary, notify_appointment_reminders, coach_send_client_messages, coach_send_client_check_in_reviews, coach_send_client_form_review_replies, coach_send_client_nutrition_setup, coach_send_client_team_updates, coach_send_client_invites, coach_send_client_workout_reminders, coach_send_client_check_in_reminders, coach_send_client_unread_digest, coach_send_client_appointment_reminders, coach_send_client_onboarding_documents, stripe_customer_id'
    )
    .eq('id', user!.id)
    .single()

  const [{ data: programs }, { templates: messageTemplates }, onboardingDocuments] =
    await Promise.all([
    supabase
      .from('programs')
      .select('id, name, status')
      .eq('coach_id', user!.id)
      .order('name', { ascending: true }),
    fetchCoachMessageTemplates(supabase, user!.id),
    fetchCoachOnboardingDocuments(supabase, user!.id),
  ])

  const profileDefaults = {
    fullName: profile?.full_name?.trim() ?? '',
    businessName: profile?.business_name?.trim() ?? '',
  }
  const coachingPreferences = parseCoachPreferences(profile)
  const notificationPreferences = parseNotificationPreferences(profile)
  const coachClientNotificationPreferences =
    parseCoachClientNotificationPreferences(profile)
  const onboardingAutomationDefaults = {
    defaultOnboardingProgramId: profile?.default_onboarding_program_id ?? '',
    onboardingWelcomeTemplateId: profile?.onboarding_welcome_template_id ?? '',
  }
  const onboardingMilestoneTemplate = parseOnboardingMilestoneTemplate(
    profile?.onboarding_milestone_template
  )
  const subscriptionContext = await getCoachSubscriptionContext(supabase, user!.id)
  const connectResult = await loadCoachConnectStatusSafe(supabase, user!.id)

  let connectStatus: ConnectAccountStatus | null = connectResult.schemaError
    ? null
    : connectResult.connectStatus

  if (
    !connectResult.schemaError &&
    isStripeConfigured() &&
    (connect === 'success' || connect === 'refresh')
  ) {
    try {
      connectStatus = await syncCoachConnectStatus(user!.id)
    } catch {
      // Fall back to cached profile flags if Stripe sync fails.
    }
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
            <div className="mt-6">
              <OnboardingMilestoneTemplateSettings
                defaultTemplate={onboardingMilestoneTemplate}
              />
            </div>
            <div className="mt-6">
              <OnboardingDocumentTemplatesSettings documents={onboardingDocuments} />
            </div>
          </SettingsSection>

          <SettingsSection
            id="notifications"
            title="Notifications"
            description="Choose what you receive, what you send to clients, and enable browser pop-ups for background alerts."
          >
            <SettingsSubsection
              title="Your notifications"
              description="Choose what alerts you receive as a coach — on your dashboard, by email, and in your browser."
            >
              <NotificationSettings
                defaultValues={notificationPreferences}
                emailDeliveryEnabled={isEmailDeliveryConfigured()}
              />
              <WebPushSettings role="coach" />
            </SettingsSubsection>
            <CoachClientNotificationSettings
              defaultValues={coachClientNotificationPreferences}
              emailDeliveryEnabled={isEmailDeliveryConfigured()}
            />
          </SettingsSection>

          <SettingsSection
            id="billing"
            title="Billing"
            description="Your plan, client usage, and upgrade options."
          >
            <BillingSettings
              context={subscriptionContext}
              stripeEnabled={isStripeConfigured()}
              hasStripeCustomer={Boolean(profile?.stripe_customer_id)}
              checkoutSuccess={checkout === 'success'}
            />
          </SettingsSection>

          <SettingsSection
            id="payments"
            title="Payments"
            description="Connect Stripe to bill clients and receive payouts."
          >
            {connectResult.schemaError ? (
              <SchemaSetupNotice
                tables={CLIENT_BILLING_SCHEMA_TABLES}
                sqlFile={CLIENT_BILLING_SQL_FILE}
              />
            ) : (
              <PaymentsSettings
                connectStatus={connectStatus ?? connectResult.connectStatus}
                connectSuccess={connect === 'success'}
                connectRefresh={connect === 'refresh'}
                stripeKeyMode={getStripeKeyMode()}
                liveModeHttpsBlocked={Boolean(
                  getLiveModeHttpsRedirectError(getAppBaseUrl())
                )}
                appBaseUrl={getAppBaseUrl()}
              />
            )}
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
