import { PortalAccountSettings } from '@/components/portal/portal-account-settings'
import { PortalLeaderboardProfileCard } from '@/components/portal/portal-leaderboard-profile-card'
import { PortalNotificationSettings } from '@/components/portal/portal-notification-settings'
import { PortalProfileSettingsForm } from '@/components/portal/portal-profile-settings-form'
import { PortalSettingsNav } from '@/components/portal/portal-settings-nav'
import { PortalUnlinkedState } from '@/components/portal/portal-unlinked-state'
import { PortalWeightUnitSettings } from '@/components/portal/portal-weight-unit-settings'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { SettingsSection } from '@/components/settings/settings-section'
import { defaultCoachPreferences } from '@/lib/coach-preferences'
import { isEmailDeliveryConfigured } from '@/lib/email/config'
import { getPortalNotificationPreferencesForUser } from '@/lib/portal-notification-preferences-server'
import { getPortalClientContext } from '@/lib/portal-client'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Settings — Coaching App',
}

export default async function PortalAccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, weight_unit')
    .eq('id', user.id)
    .single()

  const portalCtx = await getPortalClientContext()
  const clientRecord = portalCtx?.client ?? null

  const name =
    clientRecord?.full_name?.trim() ||
    profile?.full_name?.trim() ||
    user.email?.split('@')[0] ||
    'Client'

  const avatarUrl = clientRecord?.avatar_url ?? profile?.avatar_url
  const weightUnit = profile?.weight_unit ?? defaultCoachPreferences.weightUnit
  const notificationPreferences =
    await getPortalNotificationPreferencesForUser(user.id)
  const emailDeliveryEnabled = isEmailDeliveryConfigured()
  const showLeaderboard =
    !!clientRecord && clientRecord.leaderboard_opt_out !== true

  const preferencesSection = (
    <SettingsSection
      id="preferences"
      title="Preferences"
      description="Units and display options for your training data."
    >
      <PortalWeightUnitSettings defaultWeightUnit={weightUnit} />
    </SettingsSection>
  )

  const notificationsSection = (
    <SettingsSection
      id="notifications"
      title="Notifications"
      description="Choose what you want to be notified about by email."
    >
      <PortalNotificationSettings
        defaultValues={notificationPreferences}
        emailDeliveryEnabled={emailDeliveryEnabled}
      />
    </SettingsSection>
  )

  const appearanceSection = (
    <SettingsSection
      id="appearance"
      title="Appearance"
      description="Customize how the portal looks on your device."
    >
      <AppearanceSettings />
    </SettingsSection>
  )

  const accountSection = (
    <SettingsSection
      id="account"
      title="Account"
      description="Security and sign-in."
    >
      <PortalAccountSettings />
    </SettingsSection>
  )

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="space-y-1">
        <h1 className="page-title">Settings</h1>
        <p className="helper-text text-muted-foreground">
          Manage your profile, preferences, notifications, and account security.
        </p>
      </div>

      {!clientRecord ? (
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <PortalSettingsNav showProfile={false} />

          <div className="space-y-6">
            <PortalUnlinkedState
              description="Your account is not linked to a client profile yet. Ask your coach to send you an invite link."
            />

            {appearanceSection}
            {preferencesSection}
            {notificationsSection}
            {accountSection}
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <PortalSettingsNav showLeaderboard={showLeaderboard} />

          <div className="space-y-6">
            <SettingsSection
              id="profile"
              title="Profile"
              description="Your name and photo shown to your coach and teammates."
            >
              <PortalProfileSettingsForm
                defaultValues={{ fullName: name }}
                email={user.email ?? ''}
                avatarUrl={avatarUrl}
              />
            </SettingsSection>

            {appearanceSection}
            {preferencesSection}
            {notificationsSection}

            {showLeaderboard ? (
              <div id="leaderboard" className="scroll-mt-6">
                <PortalLeaderboardProfileCard
                  defaultBiologicalSex={clientRecord.biological_sex ?? null}
                />
              </div>
            ) : null}

            {accountSection}
          </div>
        </div>
      )}
    </div>
  )
}
