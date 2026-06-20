'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { updateProfile } from '@/app/(dashboard)/settings/actions'
import { CoachAvatarUpload } from '@/components/settings/coach-avatar-upload'
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
  profileFormSchema,
  type ProfileFormValues,
} from '@/lib/validations/profile'

export function ProfileSettingsForm({
  defaultValues,
  email,
  avatarUrl,
}: {
  defaultValues: ProfileFormValues
  email: string
  avatarUrl?: string | null
}) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
  })

  async function onSubmit(values: ProfileFormValues) {
    const result = await updateProfile(values)
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
        <CoachAvatarUpload
          name={form.watch('fullName') || 'Coach'}
          avatarUrl={avatarUrl}
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

        <FormField
          control={form.control}
          name="businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Your coaching brand (optional)"
                  {...field}
                />
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
