'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  inviteClientRecord,
  createClientRecord,
} from '@/app/(dashboard)/clients/actions'
import { uploadPendingClientAvatar, setClientAvatarPreset } from '@/app/(dashboard)/clients/avatar-actions'
import { ClientAvatarUpload } from '@/components/clients/client-avatar'
import { ClientCoachingTypeField } from '@/components/clients/client-coaching-type-field'
import { ClientGymField } from '@/components/clients/client-gym-field'
import type { ClientAvatarPresetId } from '@/lib/client-avatar-presets'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  clientFormDefaults,
  clientFormSchema,
  inviteClientDefaults,
  inviteClientSchema,
  type ClientFormValues,
  type InviteClientValues,
} from '@/lib/validations/client'

type AddClientDialogProps = {
  trigger?: React.ReactNode
  gyms?: { id: string; name: string }[]
}

async function copyInviteUrl(url: string) {
  await navigator.clipboard.writeText(url)
}

export function AddClientDialog({ trigger, gyms = [] }: AddClientDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [mode, setMode] = React.useState<'invite' | 'manual'>('invite')
  const [lastInviteUrl, setLastInviteUrl] = React.useState<string | null>(null)
  const [pendingAvatar, setPendingAvatar] = React.useState<File | null>(null)
  const [pendingPresetId, setPendingPresetId] =
    React.useState<ClientAvatarPresetId | null>(null)

  const inviteForm = useForm<InviteClientValues>({
    resolver: zodResolver(inviteClientSchema),
    defaultValues: inviteClientDefaults,
  })

  const manualForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: clientFormDefaults,
  })

  React.useEffect(() => {
    if (open) {
      setLastInviteUrl(null)
      setPendingAvatar(null)
      setPendingPresetId(null)
      inviteForm.reset(inviteClientDefaults)
      manualForm.reset(clientFormDefaults)
      setMode('invite')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const inviteName = inviteForm.watch('fullName')
  const manualName = manualForm.watch('fullName')
  const displayName = mode === 'invite' ? inviteName : manualName

  async function savePendingAvatar(clientId: string) {
    if (pendingPresetId) {
      const result = await setClientAvatarPreset(clientId, pendingPresetId)
      setPendingPresetId(null)
      if (!result.success) {
        toast.error(result.error)
      }
      return
    }

    if (!pendingAvatar) return
    const formData = new FormData()
    formData.set('file', pendingAvatar)
    const result = await uploadPendingClientAvatar(clientId, formData)
    setPendingAvatar(null)
    if (!result.success) {
      toast.error(result.error)
    }
  }

  async function onInviteSubmit(values: InviteClientValues) {
    const result = await inviteClientRecord(values)
    if (result.success) {
      await savePendingAvatar(result.clientId)
      setLastInviteUrl(result.inviteUrl)
      toast.success('Invite created — share the link with your client')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function onManualSubmit(values: ClientFormValues) {
    const result = await createClientRecord(values)
    if (result.success) {
      await savePendingAvatar(result.clientId)
      toast.success('Client added')
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-semibold tracking-tight">Add client</DialogTitle>
          <DialogDescription>
            Invite a client to create their own account, or add their details
            manually and invite them later.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as 'invite' | 'manual')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="gap-1.5">
              <Mail className="size-4" />
              Invite client
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5">
              <UserPlus className="size-4" />
              Add manually
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="mt-4 space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your client will receive a link to sign up, onboard, and view
              workouts you assign them.
            </p>

            {lastInviteUrl ? (
              <div className="space-y-3 rounded-lg border p-4">
                <p className="text-sm font-medium">Invite link ready</p>
                <p className="text-muted-foreground break-all text-xs">
                  {lastInviteUrl}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      await copyInviteUrl(lastInviteUrl)
                      toast.success('Invite link copied')
                    }}
                  >
                    Copy link
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLastInviteUrl(null)
                      inviteForm.reset(inviteClientDefaults)
                    }}
                  >
                    Invite another
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...inviteForm}>
                <form
                  onSubmit={inviteForm.handleSubmit(onInviteSubmit)}
                  className="grid gap-4"
                >
                  <ClientAvatarUpload
                    name={displayName || 'Client'}
                    onPendingFile={setPendingAvatar}
                    onPendingPreset={setPendingPresetId}
                    selectedPresetId={pendingPresetId}
                    size="sm"
                  />
                  <FormField
                    control={inviteForm.control}
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
                  <FormField
                    control={inviteForm.control}
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
                  <ClientCoachingTypeField
                    control={inviteForm.control}
                    name="coachingType"
                  />
                  <ClientGymField
                    control={inviteForm.control}
                    name="gymId"
                    gyms={gyms}
                  />
                  <FormField
                    control={inviteForm.control}
                    name="goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal (optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Build strength for marathon season"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={inviteForm.formState.isSubmitting}
                    >
                      {inviteForm.formState.isSubmitting
                        ? 'Creating…'
                        : 'Create invite'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              Add client details yourself. You can send an account invite from
              their profile anytime.
            </p>
            <Form {...manualForm}>
              <form
                onSubmit={manualForm.handleSubmit(onManualSubmit)}
                className="grid gap-4"
              >
                <ClientAvatarUpload
                  name={displayName || 'Client'}
                  onPendingFile={setPendingAvatar}
                  onPendingPreset={setPendingPresetId}
                  selectedPresetId={pendingPresetId}
                  size="sm"
                />
                <FormField
                  control={manualForm.control}
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
                    control={manualForm.control}
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
                    control={manualForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={manualForm.control}
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
                <ClientCoachingTypeField
                  control={manualForm.control}
                  name="coachingType"
                />
                <ClientGymField
                  control={manualForm.control}
                  name="gymId"
                  gyms={gyms}
                />
                <FormField
                  control={manualForm.control}
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
                  control={manualForm.control}
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
                <DialogFooter className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={manualForm.formState.isSubmitting}
                  >
                    {manualForm.formState.isSubmitting
                      ? 'Saving…'
                      : 'Add client'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
