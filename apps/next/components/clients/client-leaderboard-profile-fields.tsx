import { SettingsToggle } from '@/components/settings/settings-toggle'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'

type ClientLeaderboardProfileFieldsProps<T extends FieldValues> = {
  control: Control<T>
  biologicalSexName: FieldPath<T>
  leaderboardOptOutName: FieldPath<T>
}

export function ClientLeaderboardProfileFields<T extends FieldValues>({
  control,
  biologicalSexName,
  leaderboardOptOutName,
}: ClientLeaderboardProfileFieldsProps<T>) {
  return (
    <div className="space-y-4 border-t pt-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">Leaderboard profile</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Wilks / DOTS scoring needs biological sex and a recent bodyweight from
          InBody or check-ins.
        </p>
      </div>

      <FormField
        control={control}
        name={biologicalSexName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Biological sex</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? 'none'}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Used for Wilks and DOTS coefficient tables.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={leaderboardOptOutName}
        render={({ field }) => (
          <FormItem>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <FormLabel>Hide from leaderboards</FormLabel>
                <FormDescription>
                  The athlete can still log workouts and track their own progress.
                </FormDescription>
              </div>
              <FormControl>
                <SettingsToggle
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                  label="Hide from leaderboards"
                />
              </FormControl>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
