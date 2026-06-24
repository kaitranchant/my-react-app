'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'

import { updateCoachingPreferences } from '@/app/(dashboard)/settings/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { guessCoachTimezoneFromBrowser } from '@/lib/coach-onboarding'
import {
  checkInFrequencies,
  coachingPreferencesSchema,
  type CoachingPreferencesValues,
} from '@/lib/validations/coaching-preferences'

const DISMISS_KEY = (userId: string) => `coach-setup-wizard-dismissed:${userId}`

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

type CoachSetupDialogProps = {
  userId: string
  show: boolean
}

export function CoachSetupDialog({ userId, show }: CoachSetupDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [ready, setReady] = React.useState(false)

  const form = useForm<CoachingPreferencesValues>({
    resolver: zodResolver(coachingPreferencesSchema),
    defaultValues: {
      weightUnit: 'lbs',
      weekStartsOn: 'monday',
      timezone: 'auto',
      defaultCheckInFrequency: 'weekly',
    },
  })

  React.useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY(userId)) === '1'
      setOpen(show && !dismissed)
    } catch {
      setOpen(show)
    }
    setReady(true)
  }, [show, userId])

  React.useEffect(() => {
    if (!open) return
    form.reset({
      weightUnit: 'lbs',
      weekStartsOn: 'monday',
      timezone: guessCoachTimezoneFromBrowser(),
      defaultCheckInFrequency: 'weekly',
    })
  }, [open, form])

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY(userId), '1')
    } catch {
      // ignore
    }
    setOpen(false)
  }

  async function onSubmit(values: CoachingPreferencesValues) {
    const result = await updateCoachingPreferences(values)
    if (result.success) {
      toast.success('Coaching preferences saved')
      dismiss()
    } else {
      toast.error(result.error)
    }
  }

  if (!ready) {
    return null
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismiss()
        else setOpen(true)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="bg-brand/10 text-brand mb-1 flex size-10 items-center justify-center rounded-lg">
            <Settings2 className="size-5" />
          </div>
          <DialogTitle>Set your coaching defaults</DialogTitle>
          <DialogDescription>
            These apply across calendars, check-ins, and load charts. You can
            change them anytime in Settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="weightUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight unit</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
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

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
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

            <FormField
              control={form.control}
              name="defaultCheckInFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-in frequency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
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

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={dismiss}>
                Skip for now
              </Button>
              <Button type="submit" variant="brand" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : 'Save and continue'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
