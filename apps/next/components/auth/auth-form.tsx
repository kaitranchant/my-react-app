'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'

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
import type { AuthState } from '@/app/(auth)/actions'

type AuthAction = (
  prevState: AuthState,
  formData: FormData
) => Promise<AuthState>

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
  action,
}: {
  mode: 'login' | 'signup'
  action: AuthAction
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {})
  const isSignup = mode === 'signup'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </CardTitle>
        <CardDescription>
          {isSignup
            ? 'Start managing your clients and programs.'
            : 'Sign in to your coaching dashboard.'}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4">
          {isSignup && (
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Alex Coach"
                autoComplete="name"
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
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="text-sm text-emerald-600" role="status">
              {state.message}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-4">
          <SubmitButton label={isSignup ? 'Create account' : 'Sign in'} />
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
        </CardFooter>
      </form>
    </Card>
  )
}
