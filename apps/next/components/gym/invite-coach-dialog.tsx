'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import { inviteCoachToGym } from '@/app/(dashboard)/gym/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  inviteCoachSchema,
  type InviteCoachValues,
} from '@/lib/validations/gym'

export function InviteCoachDialog({ gymId }: { gymId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null)

  const form = useForm<InviteCoachValues>({
    resolver: zodResolver(inviteCoachSchema),
    defaultValues: { email: '' },
  })

  React.useEffect(() => {
    if (!open) {
      form.reset({ email: '' })
      setInviteUrl(null)
    }
  }, [open, form])

  async function onSubmit(values: InviteCoachValues) {
    const result = await inviteCoachToGym(gymId, values)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    setInviteUrl(result.inviteUrl)
    toast.success('Invite link created. Copy it and send it to the coach.')
    router.refresh()
  }

  async function copyLink() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    toast.success('Invite link copied.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="size-4" />
          Invite coach
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a coach</DialogTitle>
          <DialogDescription>
            Enter the coach&apos;s email to generate a one-time invite link. No
            email is sent automatically — copy the link and share it yourself
            (message, email, etc.). They must sign up or log in with that email
            to join your gym.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="coach@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {inviteUrl ? (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="text-muted-foreground mb-2">
                  Share this link with the coach:
                </p>
                <p className="break-all font-mono text-xs">{inviteUrl}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={copyLink}
                >
                  Copy link
                </Button>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Creating…'
                  : inviteUrl
                    ? 'Create another link'
                    : 'Create invite link'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
