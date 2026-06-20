import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/dashboard/page-header'
import { AccountSettings } from '@/components/settings/account-settings'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { CoachingPreferences } from '@/components/settings/coaching-preferences'
import { NotificationSettings } from '@/components/settings/notification-settings'
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
    .select('full_name, business_name, avatar_url')
    .eq('id', user!.id)
    .single()

  const profileDefaults = {
    fullName: profile?.full_name?.trim() ?? '',
    businessName: profile?.business_name?.trim() ?? '',
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
            <CoachingPreferences />
          </SettingsSection>

          <SettingsSection
            id="notifications"
            title="Notifications"
            description="Choose what you want to be notified about."
          >
            <NotificationSettings />
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
