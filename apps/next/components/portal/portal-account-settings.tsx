import { LogOut } from 'lucide-react'

import { signOut } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { ChangePasswordDialog } from '@/components/settings/change-password-dialog'
import { SettingsRow } from '@/components/settings/settings-row'

export function PortalAccountSettings() {
  return (
    <div>
      <SettingsRow
        label="Password"
        description="Update the password you use to sign in."
      >
        <ChangePasswordDialog />
      </SettingsRow>

      <SettingsRow label="Sign out" description="Sign out of this device.">
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </SettingsRow>
    </div>
  )
}
