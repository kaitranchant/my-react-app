'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { updateCoachingPreferences } from '@/app/(dashboard)/settings/actions'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
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
import { SettingsRow } from '@/components/settings/settings-row'
import {
  checkInFrequencies,
  coachingPreferencesSchema,
  type CoachingPreferencesValues,
} from '@/lib/validations/coaching-preferences'

const timezoneLabels: Record<
  CoachingPreferencesValues['timezone'],
  string
> = {
  auto: 'Browser default',
  america_new_york: 'Eastern (US)',
  america_chicago: 'Central (US)',
  america_denver: 'Mountain (US)',
  america_los_angeles: 'Pacific (US)',
  europe_london: 'London',
}

const checkInFrequencyLabels: Record<
  CoachingPreferencesValues['defaultCheckInFrequency'],
  string
> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
}

export function CoachingPreferencesForm({
  defaultValues,
}: {
  defaultValues: CoachingPreferencesValues
}) {
  const form = useForm<CoachingPreferencesValues>({
    resolver: zodResolver(coachingPreferencesSchema),
    defaultValues,
  })

  async function onSubmit(values: CoachingPreferencesValues) {
    const result = await updateCoachingPreferences(values)
    if (result.success) {
      toast.success('Coaching preferences saved')
      form.reset(values)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0">
        <SettingsRow
          label="Weight unit"
          description="Default unit shown in workout logs and load charts."
        >
          <FormField
            control={form.control}
            name="weightUnit"
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsRow>

        <SettingsRow
          label="Week starts on"
          description="Used for weekly summaries and calendar views."
        >
          <FormField
            control={form.control}
            name="weekStartsOn"
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsRow>

        <SettingsRow
          label="Timezone"
          description="Weekly boundaries and summaries use this timezone when set."
        >
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(timezoneLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsRow>

        <SettingsRow
          label="Default check-in frequency"
          description="Controls when clients see check-ins as due in the portal and on your dashboard action items."
        >
          <FormField
            control={form.control}
            name="defaultCheckInFrequency"
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {checkInFrequencies.map((frequency) => (
                      <SelectItem key={frequency} value={frequency}>
                        {checkInFrequencyLabels[frequency]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </SettingsRow>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting ? 'Saving…' : 'Save preferences'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
