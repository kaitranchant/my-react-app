'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { updatePortalProfile } from '@/app/portal/account/actions'
import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  portalProfileFormSchema,
  type PortalProfileFormValues,
} from '@/lib/validations/portal-profile'

export function PortalProfileSettingsForm({
  defaultValues,
  email,
  avatarUrl,
}: {
  defaultValues: PortalProfileFormValues
  email: string
  avatarUrl?: string | null
}) {
  const form = useForm<PortalProfileFormValues>({
    resolver: zodResolver(portalProfileFormSchema),
    defaultValues,
  })

  async function onSubmit(values: PortalProfileFormValues) {
    const result = await updatePortalProfile(values)
    if (result.success) {
      toast.success('Profile updated')
      form.reset(values)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <ClientAvatarUpload
          name={form.watch('fullName') || 'Client'}
          avatarUrl={avatarUrl}
          forClientPortal
          size="lg"
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Email</FormLabel>
          <Input value={email} disabled readOnly />
          <p className="text-muted-foreground text-xs">
            Email is managed through your sign-in provider.
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
          >
            {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
