import { KeyRound, LogOut, Trash2 } from 'lucide-react'

import { signOut } from '@/app/(auth)/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SettingsRow } from '@/components/settings/settings-row'

export function AccountSettings() {
  return (
    <div>
      <SettingsRow
        label="Password"
        description="Update the password you use to sign in."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <KeyRound className="size-4" />
            Change password
          </Button>
          <Badge variant="outline" className="text-[10px] font-normal">
            Soon
          </Badge>
        </div>
      </SettingsRow>

      <SettingsRow label="Sign out" description="Sign out of this device.">
        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </SettingsRow>

      <SettingsRow
        label="Delete account"
        description="Permanently remove your account and all associated data."
        className="border-destructive/20"
      >
        <div className="flex items-center gap-2">
          <Button variant="destructive" size="sm" disabled>
            <Trash2 className="size-4" />
            Delete account
          </Button>
          <Badge variant="outline" className="text-[10px] font-normal">
            Soon
          </Badge>
        </div>
      </SettingsRow>
    </div>
  )
}
