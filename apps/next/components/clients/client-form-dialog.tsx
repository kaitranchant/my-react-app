'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  clientFormDefaults,
  clientFormSchema,
  type ClientFormValues,
} from '@/lib/validations/client'
import {
  createClientRecord,
  updateClientRecord,
} from '@/app/(dashboard)/clients/actions'
import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { ClientCoachingTypeField } from '@/components/clients/client-coaching-type-field'
import { ClientLeaderboardProfileFields } from '@/components/clients/client-leaderboard-profile-fields'
import { ClientAccountEmailActions } from '@/components/clients/client-account-email-actions'
import type { Client } from 'app/types/database'

function clientToFormValues(client: Client): ClientFormValues {
  return {
    fullName: client.full_name,
    email: client.email ?? '',
    phone: client.phone ?? '',
    status: client.status,
    coachingType: client.coaching_type ?? 'none',
    goal: client.goal ?? '',
    notes: client.notes ?? '',
    biologicalSex: client.biological_sex ?? 'none',
    leaderboardOptOut: client.leaderboard_opt_out ?? false,
  }
}

type ClientFormDialogProps = {
  client?: Client
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ClientFormDialog({
  client,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ClientFormDialogProps) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  const isEdit = Boolean(client)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: client ? clientToFormValues(client) : clientFormDefaults,
  })

  React.useEffect(() => {
    if (open) {
      form.reset(client ? clientToFormValues(client) : clientFormDefaults)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function onSubmit(values: ClientFormValues) {
    const result = isEdit
      ? await updateClientRecord(client!.id, values)
      : await createClientRecord(values)

    if (result.success) {
      toast.success(isEdit ? 'Client updated' : 'Client added')
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit client' : 'Add client'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update this client’s details.'
              : 'Add a new client to your practice.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            {isEdit && client && (
              <ClientAvatarUpload
                clientId={client.id}
                name={form.watch('fullName') || client.full_name}
                avatarUrl={client.avatar_url}
                size="sm"
              />
            )}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jordan Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="jordan@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ClientCoachingTypeField control={form.control} name="coachingType" />

            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Run a sub-2hr half marathon"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Injuries, preferences, context…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ClientLeaderboardProfileFields
              control={form.control}
              biologicalSexName="biologicalSex"
              leaderboardOptOutName="leaderboardOptOut"
            />

            {isEdit && client && <ClientAccountEmailActions client={client} />}

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving…'
                  : isEdit
                    ? 'Save changes'
                    : 'Add client'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
