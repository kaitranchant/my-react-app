'use client'

import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { login, signup, type AuthState } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type InvitePreview = {
  clientName: string
  coachName: string
  email: string
  inviteToken: string
}

export type GymInvitePreview = {
  gymName: string
  inviterName: string
  email: string
  inviteToken: string
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Please wait…' : label}
    </Button>
  )
}

export function AuthForm({
  mode,
  invitePreview,
  gymInvitePreview,
  redirectTo,
}: {
  mode: 'login' | 'signup'
  invitePreview?: InvitePreview | null
  gymInvitePreview?: GymInvitePreview | null
  redirectTo?: string
}) {
  const router = useRouter()
  const action = mode === 'login' ? login : signup
  const [state, formAction] = useActionState<AuthState, FormData>(action, {})
  const isSignup = mode === 'signup'
  const isClientInvite = Boolean(isSignup && invitePreview)
  const isGymInvite = Boolean(isSignup && gymInvitePreview)
  const hasInvite = isClientInvite || isGymInvite

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo)
      router.refresh()
    }
  }, [router, state.redirectTo])

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-xl font-semibold tracking-tight">
          {isClientInvite
            ? 'Join your coach'
            : isGymInvite
              ? 'Join gym'
              : isSignup
                ? 'Create your account'
                : 'Welcome back'}
        </CardTitle>
        <CardDescription>
          {isClientInvite && invitePreview
            ? `${invitePreview.coachName} invited you to track workouts and progress.`
            : isGymInvite && gymInvitePreview
              ? `${gymInvitePreview.inviterName} invited you to join ${gymInvitePreview.gymName} as a coach.`
              : isSignup
                ? 'Start managing your clients and programs.'
                : 'Sign in to your coaching dashboard.'}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        {mode === 'login' && redirectTo ? (
          <input type="hidden" name="redirectTo" value={redirectTo} />
        ) : null}
        {isClientInvite && invitePreview && (
          <input
            type="hidden"
            name="inviteToken"
            value={invitePreview.inviteToken}
          />
        )}
        {isGymInvite && gymInvitePreview && (
          <input
            type="hidden"
            name="gymInviteToken"
            value={gymInvitePreview.inviteToken}
          />
        )}
        <CardContent className="grid gap-4">
          {isSignup && (
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Jordan Smith"
                autoComplete="name"
                defaultValue={invitePreview?.clientName ?? ''}
                required={hasInvite}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              defaultValue={
                invitePreview?.email ?? gymInvitePreview?.email ?? ''
              }
              readOnly={hasInvite}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
            />
          </div>

          {state.error && (
            <div
              className="bg-destructive/5 text-destructive rounded-lg border border-destructive/15 px-3 py-2.5 text-sm leading-relaxed"
              role="alert"
            >
              {state.error}
            </div>
          )}
          {state.message && (
            <div
              className="rounded-lg border border-foreground/10 bg-muted px-3 py-2.5 text-sm leading-relaxed"
              role="status"
            >
              {state.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-4">
          <SubmitButton
            label={
              isClientInvite
                ? 'Create account & join'
                : isGymInvite
                  ? 'Create account & join gym'
                  : isSignup
                    ? 'Create account'
                    : 'Sign in'
            }
          />
          {!hasInvite && (
            <p className="text-muted-foreground text-center text-sm">
              {isSignup ? (
                <>
                  Already have an account?{' '}
                  <Link
                    href="/login"
                    className="text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Need an account?{' '}
                  <Link
                    href="/signup"
                    className="text-foreground font-medium underline-offset-4 hover:underline"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </p>
          )}
          {isSignup ? (
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              By creating an account, you agree to our{' '}
              <Link
                href="/privacy"
                className="text-foreground font-medium underline-offset-4 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
          ) : null}
        </CardFooter>
      </form>
    </Card>
  )
}
