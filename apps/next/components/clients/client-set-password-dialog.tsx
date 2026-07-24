'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { setClientAccountPassword } from '@/app/(dashboard)/clients/actions'
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
  setClientPasswordSchema,
  type SetClientPasswordValues,
} from '@/lib/validations/account'
import type { Client } from 'app/types/database'

type ClientSetPasswordDialogProps = {
  client: Client
  trigger?: React.ReactNode
}

function generatePassword(length = 12): string {
  const alphabet =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
}

export function ClientSetPasswordDialog({
  client,
  trigger,
}: ClientSetPasswordDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [savedPassword, setSavedPassword] = React.useState<string | null>(null)
  const [savedEmail, setSavedEmail] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const hasAccount =
    client.invite_status === 'accepted' || Boolean(client.user_id)
  const hasEmail = Boolean(client.email?.trim())

  const form = useForm<SetClientPasswordValues>({
    resolver: zodResolver(setClientPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  })

  React.useEffect(() => {
    if (!open) {
      form.reset()
      setShowPassword(false)
      setSavedPassword(null)
      setSavedEmail(null)
      setCopied(false)
    }
  }, [open, form])

  function handleGenerate() {
    const password = generatePassword()
    form.setValue('newPassword', password, { shouldValidate: true })
    form.setValue('confirmPassword', password, { shouldValidate: true })
    setShowPassword(true)
  }

  async function onSubmit(values: SetClientPasswordValues) {
    const result = await setClientAccountPassword(client.id, values)
    if (!result.success) {
      toast.error(result.error)
      return
    }

    setSavedPassword(values.newPassword)
    setSavedEmail(result.email)
    toast.success(
      result.createdAccount
        ? 'Portal account created with this password'
        : 'Password updated'
    )
  }

  async function handleCopy() {
    if (!savedPassword) return
    try {
      await navigator.clipboard.writeText(savedPassword)
      setCopied(true)
      toast.success('Password copied')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy password.')
    }
  }

  const defaultTrigger = (
    <Button type="button" variant="outline" size="sm" disabled={!hasEmail}>
      <KeyRound className="size-4" />
      {hasAccount ? 'Set password' : 'Create login & password'}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasAccount ? 'Set client password' : 'Create portal login'}
          </DialogTitle>
          <DialogDescription>
            {hasAccount
              ? 'Existing passwords can’t be viewed. Set a new one here, then share it with your client.'
              : 'Create their portal account now and choose the password they will use to sign in.'}
          </DialogDescription>
        </DialogHeader>

        {savedPassword ? (
          <div className="grid gap-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Password ready to share</p>
              <p className="text-muted-foreground mt-1">
                Copy it now — it won’t be shown again after you close this
                dialog.
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={savedEmail ?? client.email ?? ''} readOnly />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Password</label>
              <div className="flex gap-2">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={savedPassword}
                  readOnly
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void handleCopy()}
                  aria-label="Copy password"
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {client.email ? (
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input value={client.email} readOnly />
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Password</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 text-xs"
                        onClick={handleGenerate}
                      >
                        <RefreshCw className="size-3.5" />
                        Generate
                      </Button>
                    </div>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowPassword((value) => !value)}
                          aria-label={
                            showPassword ? 'Hide password' : 'Show password'
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? 'Saving…'
                    : hasAccount
                      ? 'Save password'
                      : 'Create login'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
