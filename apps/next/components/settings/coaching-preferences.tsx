import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingsRow } from '@/components/settings/settings-row'

export function CoachingPreferences() {
  return (
    <div>
      <SettingsRow
        label="Weight unit"
        description="Default unit shown in workout logs and load charts."
      >
        <div className="flex items-center gap-2">
          <Select defaultValue="lbs" disabled>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lbs">Pounds (lbs)</SelectItem>
              <SelectItem value="kg">Kilograms (kg)</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] font-normal">
            Soon
          </Badge>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Week starts on"
        description="Used for weekly summaries and calendar views."
      >
        <div className="flex items-center gap-2">
          <Select defaultValue="monday" disabled>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sunday">Sunday</SelectItem>
              <SelectItem value="monday">Monday</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] font-normal">
            Soon
          </Badge>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Timezone"
        description="Check-in deadlines and reminders use this timezone."
      >
        <div className="flex items-center gap-2">
          <Select defaultValue="auto" disabled>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Browser default</SelectItem>
              <SelectItem value="america_new_york">Eastern (US)</SelectItem>
              <SelectItem value="america_chicago">Central (US)</SelectItem>
              <SelectItem value="america_denver">Mountain (US)</SelectItem>
              <SelectItem value="america_los_angeles">Pacific (US)</SelectItem>
              <SelectItem value="europe_london">London</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] font-normal">
            Soon
          </Badge>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Default check-in frequency"
        description="Suggested cadence when assigning check-in templates to clients."
      >
        <div className="flex items-center gap-2">
          <Select defaultValue="weekly" disabled>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Bi-weekly</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-[10px] font-normal">
            Soon
          </Badge>
        </div>
      </SettingsRow>

      <p className="text-muted-foreground pt-2 text-xs">
        Coaching preferences will sync across your dashboard once saved.
      </p>
    </div>
  )
}
