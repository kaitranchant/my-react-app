'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { updateSessionBookingSettings } from '@/app/(dashboard)/scheduling/actions'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  sessionBookingSettingsSchema,
  type SessionBookingSettingsValues,
} from '@/lib/validations/session-booking'
import { cn } from '@/lib/utils'

function NumberSettingInput({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  className?: string
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      className={className}
      value={Number.isFinite(value) ? value : ''}
      onChange={(event) => {
        const next = event.target.valueAsNumber
        if (Number.isFinite(next)) {
          onChange(next)
        }
      }}
    />
  )
}

function BookingToggleRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-muted-foreground text-xs leading-snug sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function BookingNumberField({
  label,
  unit,
  children,
  className,
}: {
  label: string
  unit: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-sm font-medium leading-tight">{label}</p>
      <div className="flex items-center gap-2">
        {children}
        <span className="text-muted-foreground shrink-0 text-sm">{unit}</span>
      </div>
    </div>
  )
}

function BookingFullWidthRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2 border-b py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  )
}

export function SessionBookingSettingsForm({
  defaultValues,
}: {
  defaultValues: SessionBookingSettingsValues
}) {
  const form = useForm<SessionBookingSettingsValues>({
    resolver: zodResolver(sessionBookingSettingsSchema),
    defaultValues,
    mode: 'onSubmit',
  })

  async function onSubmit(values: SessionBookingSettingsValues) {
    const result = await updateSessionBookingSettings(values)
    if (result.success) {
      toast.success('Booking settings saved')
      form.reset(values)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0" noValidate>
        <BookingToggleRow
          label="Client self-booking"
          description="Allow clients to book from the portal."
        >
          <FormField
            control={form.control}
            name="sessionBookingEnabled"
            render={({ field }) => (
              <FormItem>
                <Select
                  value={field.value ? 'yes' : 'no'}
                  onValueChange={(value) => field.onChange(value === 'yes')}
                >
                  <FormControl>
                    <SelectTrigger className="w-[7.5rem]">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="yes">Enabled</SelectItem>
                    <SelectItem value="no">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </BookingToggleRow>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 border-b py-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="defaultSessionDurationMinutes"
            render={({ field }) => (
              <FormItem>
                <BookingNumberField label="Session duration" unit="min">
                  <FormControl>
                    <NumberSettingInput
                      min={15}
                      max={240}
                      className="w-full max-w-[5rem]"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </BookingNumberField>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bookingBufferMinutes"
            render={({ field }) => (
              <FormItem>
                <BookingNumberField label="Buffer" unit="min">
                  <FormControl>
                    <NumberSettingInput
                      min={0}
                      max={120}
                      className="w-full max-w-[5rem]"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </BookingNumberField>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bookingMinNoticeHours"
            render={({ field }) => (
              <FormItem>
                <BookingNumberField label="Min. notice" unit="hrs">
                  <FormControl>
                    <NumberSettingInput
                      min={0}
                      max={168}
                      className="w-full max-w-[5rem]"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </BookingNumberField>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bookingMaxDaysAhead"
            render={({ field }) => (
              <FormItem>
                <BookingNumberField label="Booking window" unit="days">
                  <FormControl>
                    <NumberSettingInput
                      min={1}
                      max={365}
                      className="w-full max-w-[5rem]"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </BookingNumberField>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="appointmentReminderHours"
            render={({ field }) => (
              <FormItem className="col-span-2 sm:col-span-1">
                <BookingNumberField label="Reminders" unit="hrs before">
                  <FormControl>
                    <NumberSettingInput
                      min={1}
                      max={168}
                      className="w-full max-w-[5rem]"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </BookingNumberField>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <BookingFullWidthRow
          label="Default location"
          description="Shown on bookings unless overridden."
        >
          <FormField
            control={form.control}
            name="defaultSessionLocation"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Gym floor, Zoom link, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </BookingFullWidthRow>

        <BookingToggleRow
          label="Require session pack"
          description="Clients need pack credits to book."
        >
          <FormField
            control={form.control}
            name="bookingRequiresSessionPack"
            render={({ field }) => (
              <FormItem>
                <Select
                  value={field.value ? 'yes' : 'no'}
                  onValueChange={(value) => field.onChange(value === 'yes')}
                >
                  <FormControl>
                    <SelectTrigger className="w-[7.5rem]">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="yes">Required</SelectItem>
                    <SelectItem value="no">Optional</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </BookingToggleRow>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Save settings
          </Button>
        </div>
      </form>
    </Form>
  )
}
